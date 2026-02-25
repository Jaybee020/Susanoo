import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  Candle,
  CandleTimeframe,
  PoolMarket,
  PoolTrade,
  relayerService,
} from "../../services/relayerService";
import { DEFAULT_DEPLOYED_POOL_ID } from "../../utils/constants";
import styles from "./TradingTerminal.module.css";

const TIMEFRAMES: CandleTimeframe[] = ["15m", "1h", "4h", "1d"];
const LEVERAGE_MARKS = [1, 5, 10, 25, 50];

const formatUsd = (value?: number | null, digits = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  if (value >= 1000)
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
  return `$${value.toFixed(digits)}`;
};

const formatChange = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
};

const formatTime = (iso?: string) => {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const toTokenAmount = (value?: string, decimals = 18) => {
  if (!value) return 0;
  try {
    const big = BigInt(value);
    return Number(big) / Math.pow(10, decimals);
  } catch {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
};

const derivePriceFromPool = (pool?: PoolMarket | null) => {
  if (!pool?.sqrtPriceX96 || !pool.token0 || !pool.token1) return null;
  try {
    const sqrt = Number(BigInt(pool.sqrtPriceX96)) / Math.pow(2, 96);
    const price = Math.pow(sqrt, 2);
    const decimalsAdjustment = Math.pow(10, (pool.token1.decimals || 18) - (pool.token0.decimals || 18));
    return price * decimalsAdjustment;
  } catch {
    return null;
  }
};

type PositionTab = "positions" | "openOrders" | "tradeHistory" | "pnl";
type TradeSide = "buy" | "sell";
type OrderType = "market" | "limit" | "stop";

const TradingTerminal: React.FC = () => {
  const [markets, setMarkets] = useState<PoolMarket[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>(DEFAULT_DEPLOYED_POOL_ID);
  const [timeframe, setTimeframe] = useState<CandleTimeframe>("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [trades, setTrades] = useState<PoolTrade[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activePositionTab, setActivePositionTab] = useState<PositionTab>("positions");
  const [tradeSide, setTradeSide] = useState<TradeSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [leverage, setLeverage] = useState(3);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const activeMarket = useMemo(
    () => markets.find((m) => m.poolId === selectedPool) || null,
    [markets, selectedPool]
  );

  // Load markets
  useEffect(() => {
    let mounted = true;
    relayerService.getActivePools().then((data) => {
      if (!mounted) return;
      setMarkets(data);
      if (!data.find((p) => p.poolId === selectedPool) && data[0]) {
        setSelectedPool(data[0].poolId);
      }
    }).catch((err) => console.error("Failed to load pools", err));
    return () => { mounted = false; };
  }, []);

  // Load candles + trades
  useEffect(() => {
    if (!selectedPool) return;
    let cancelled = false;
    setIsLoadingChart(true);
    setError(null);

    (async () => {
      try {
        const [candleData, tradeData] = await Promise.all([
          relayerService.getCandles(selectedPool, timeframe),
          relayerService.getTrades(selectedPool, 14),
        ]);
        if (cancelled) return;
        setCandles(candleData);
        setTrades(tradeData);
        if (!candleData.length) setError("No candlestick data available yet.");
      } catch {
        if (!cancelled) setError("Unable to load market data.");
      } finally {
        if (!cancelled) setIsLoadingChart(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedPool, timeframe]);

  // Create chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b0e13" },
        textColor: "#5a6178",
        fontSize: 11,
        fontFamily: "Saans, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        textColor: "#7a8194",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "rgba(255,255,255,0.1)", labelBackgroundColor: "#1a1d26" },
        horzLine: { color: "rgba(255,255,255,0.1)", labelBackgroundColor: "#1a1d26" },
      },
      localization: {
        priceFormatter: (value: number) => `$${value.toFixed(2)}`,
      },
    });

    seriesRef.current = chartRef.current.addSeries(AreaSeries, {
      lineColor: "#27ffb4",
      topColor: "rgba(39,255,180,0.18)",
      bottomColor: "rgba(39,255,180,0.02)",
      lineWidth: 2,
      priceLineColor: "#27ffb4",
      priceLineStyle: 2,
    });

    chartRef.current.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      if (!chartRef.current) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chartRef.current.applyOptions({ width, height });
        chartRef.current.timeScale().fitContent();
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || !candles.length) return;
    const data = candles.map((c) => ({
      time: Math.floor(new Date(c.time).getTime() / 1000) as UTCTimestamp,
      value: Number(c.close),
    }));
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  const latestCandle = candles[candles.length - 1];
  const latestPrice = latestCandle ? Number(latestCandle.close) : null;

  const derivedMetrics = useMemo(() => {
    if (!candles.length || !activeMarket)
      return { change: null, low: null, high: null, volume: null, trades: 0 };

    const lows = candles.map((c) => Number(c.low));
    const highs = candles.map((c) => Number(c.high));
    const first = candles[0];
    const last = candles[candles.length - 1];
    const change = first ? ((Number(last.close) - Number(first.close)) / Number(first.close)) * 100 : null;
    const quoteDecimals = activeMarket?.token1?.decimals ?? 18;
    const volume = candles.reduce((s, c) => s + toTokenAmount(c.volume1, quoteDecimals), 0);
    const tradesCount = candles.reduce((s, c) => s + c.tradeCount, 0);
    return { change, low: Math.min(...lows), high: Math.max(...highs), volume, trades: tradesCount };
  }, [candles, activeMarket]);

  // Orderbook data
  const orderBook = useMemo(() => {
    if (!latestPrice) return { bids: [] as { price: number; size: number; total: number }[], asks: [] as { price: number; size: number; total: number }[] };

    let runningTotal = 0;
    const asks = Array.from({ length: 8 }).map((_, i) => {
      const depth = 8 - i;
      const price = latestPrice * (1 + depth * 0.0008);
      const size = +(0.2 + depth * 0.5).toFixed(3);
      runningTotal += size * price;
      return { price, size, total: +runningTotal.toFixed(2) };
    });

    runningTotal = 0;
    const bids = Array.from({ length: 8 }).map((_, i) => {
      const depth = i + 1;
      const price = latestPrice * (1 - depth * 0.0008);
      const size = +(0.2 + depth * 0.45).toFixed(3);
      runningTotal += size * price;
      return { price, size, total: +runningTotal.toFixed(2) };
    });

    return { bids, asks };
  }, [latestPrice]);

  const spread = useMemo(() => {
    if (!orderBook.asks.length || !orderBook.bids.length) return null;
    return orderBook.asks[orderBook.asks.length - 1].price - orderBook.bids[0].price;
  }, [orderBook]);

  const maxTotal = useMemo(() => {
    const allTotals = [...orderBook.asks.map((l) => l.total), ...orderBook.bids.map((l) => l.total)];
    return Math.max(...allTotals, 1);
  }, [orderBook]);

  const activePairLabel = activeMarket
    ? `${activeMarket.token0?.symbol || "Token0"}-${activeMarket.token1?.symbol || "Token1"}`
    : "Select a pool";

  const tokenSymbol = activeMarket?.token0?.symbol || "ETH";

  // Mock positions for display
  const mockPositions = latestPrice
    ? [
        {
          symbol: `${tokenSymbol}-PERP`,
          leverage: "10x",
          side: "LONG" as const,
          size: `18.5 ${tokenSymbol}`,
          entryPrice: latestPrice * 0.988,
          markPrice: latestPrice,
          pnl: latestPrice * 18.5 * 0.012,
          pnlPercent: 12.5,
        },
      ]
    : [];

  return (
    <section className={styles.terminalSection}>
      {/* ── Left: Markets ──────────────────────── */}
      <div className={styles.marketColumn}>
        <div className={styles.marketHeader}>
          <h3>Markets</h3>
        </div>
        <div className={styles.marketList}>
          {markets.map((market) => {
            const isActive = market.poolId === selectedPool;
            const livePrice = derivePriceFromPool(market);
            return (
              <button
                key={market.poolId}
                className={`${styles.marketRow} ${isActive ? styles.activeMarket : ""}`}
                onClick={() => setSelectedPool(market.poolId)}
              >
                <div>
                  <p className={styles.marketName}>
                    {market.token0?.symbol}/{market.token1?.symbol}
                  </p>
                  <span className={styles.marketTicker}>
                    {market.token0?.symbol}-PERP
                  </span>
                </div>
                <div className={styles.marketStats}>
                  <strong>{livePrice ? formatUsd(livePrice, 2) : "--"}</strong>
                  <span className={styles.marketMeta}>
                    Vol: {market.stats?.volume24hToken1 || "0"}
                  </span>
                </div>
              </button>
            );
          })}
          {!markets.length && (
            <div className={styles.emptyMarketState}>No pools registered yet.</div>
          )}
        </div>

        <div className={styles.promoCard}>
          <h4>Susanoo Intelligence</h4>
          <p>AI-powered market analysis for encrypted order flow.</p>
          <span className={styles.promoLink}>Analyze Market →</span>
        </div>
        <div className={styles.promoCard}>
          <h4>Susanoo PRO</h4>
          <p>Unlock lower fees and advanced trading bots.</p>
          <span className={styles.promoLink}>Upgrade Now →</span>
        </div>
      </div>

      {/* ── Center: Chart + Positions ──────────── */}
      <div className={styles.chartColumn}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.headerStats}>
              <div className={styles.pairInfo}>
                <span className={styles.pairLabel}>{activePairLabel}</span>
                <span className={styles.pairType}>Perpetual</span>
              </div>

              <div className={styles.headerStatItem}>
                <span className={styles.headerStatLabel}>Index</span>
                <span className={styles.headerStatValue}>
                  {latestPrice ? formatUsd(latestPrice, 2) : "--"}
                </span>
              </div>

              <div className={styles.headerStatItem}>
                <span className={styles.headerStatLabel}>Funding</span>
                <span className={styles.headerStatValue}>0.0102%</span>
              </div>

              <div className={styles.headerStatItem}>
                <span className={styles.headerStatLabel}>24h Change</span>
                <span className={`${(derivedMetrics.change || 0) >= 0 ? styles.changePositive : styles.changeNegative}`}>
                  {formatChange(derivedMetrics.change)}
                </span>
              </div>

              <div className={styles.headerStatItem}>
                <span className={styles.headerStatLabel}>24h High</span>
                <span className={styles.headerStatValue}>{formatUsd(derivedMetrics.high, 2)}</span>
              </div>

              <div className={styles.headerStatItem}>
                <span className={styles.headerStatLabel}>24h Low</span>
                <span className={styles.headerStatValue}>{formatUsd(derivedMetrics.low, 2)}</span>
              </div>
            </div>

            <div className={styles.timeframeTabs}>
              {TIMEFRAMES.map((frame) => (
                <button
                  key={frame}
                  className={`${styles.timeframeButton} ${timeframe === frame ? styles.timeframeActive : ""}`}
                  onClick={() => setTimeframe(frame)}
                >
                  {frame}
                </button>
              ))}
            </div>
          </div>

          {/* Price headline */}
          <div style={{ padding: "0.5rem 1rem 0" }}>
            <span className={styles.priceValue}>
              {latestPrice ? formatUsd(latestPrice, 2) : "--"}
            </span>
          </div>

          <div className={styles.chartContainer}>
            <div ref={chartContainerRef} className={styles.chartCanvas} />
            {isLoadingChart && (
              <div className={styles.chartOverlay}>
                <LoadingSpinner />
                <p>Loading chart</p>
              </div>
            )}
            {error && !isLoadingChart && (
              <div className={styles.chartOverlay}>
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Positions / Orders tabs */}
        <div className={styles.positionsSection}>
          <div className={styles.positionsTabs}>
            <button
              className={`${styles.positionsTab} ${activePositionTab === "positions" ? styles.positionsTabActive : ""}`}
              onClick={() => setActivePositionTab("positions")}
            >
              Positions{mockPositions.length > 0 && (
                <span className={styles.positionsTabCount}>({mockPositions.length})</span>
              )}
            </button>
            <button
              className={`${styles.positionsTab} ${activePositionTab === "openOrders" ? styles.positionsTabActive : ""}`}
              onClick={() => setActivePositionTab("openOrders")}
            >
              Open Orders<span className={styles.positionsTabCount}>(0)</span>
            </button>
            <button
              className={`${styles.positionsTab} ${activePositionTab === "tradeHistory" ? styles.positionsTabActive : ""}`}
              onClick={() => setActivePositionTab("tradeHistory")}
            >
              Trade History
            </button>
            <button
              className={`${styles.positionsTab} ${activePositionTab === "pnl" ? styles.positionsTabActive : ""}`}
              onClick={() => setActivePositionTab("pnl")}
            >
              Realized PnL
            </button>
          </div>

          <div className={styles.positionsTable}>
            {activePositionTab === "positions" && (
              <>
                <div className={styles.positionsTableHead}>
                  <span>Symbol</span>
                  <span>Side</span>
                  <span>Size</span>
                  <span>Entry Price</span>
                  <span>Mark Price</span>
                  <span>PnL (ROE%)</span>
                  <span>Action</span>
                </div>
                {mockPositions.length === 0 ? (
                  <div className={styles.positionsEmpty}>No open positions</div>
                ) : (
                  mockPositions.map((pos, i) => (
                    <div key={i} className={styles.positionsTableRow}>
                      <div className={styles.symbolCell}>
                        <span className={styles.symbolDot} />
                        <span className={styles.symbolName}>{pos.symbol}</span>
                        <span className={styles.leverageBadge}>{pos.leverage}</span>
                      </div>
                      <span className={pos.side === "LONG" ? styles.sideLong : styles.sideShort}>
                        {pos.side}
                      </span>
                      <span>{pos.size}</span>
                      <span>{formatUsd(pos.entryPrice, 2)}</span>
                      <span>{formatUsd(pos.markPrice, 2)}</span>
                      <span className={pos.pnl >= 0 ? styles.pnlPositive : styles.pnlNegative}>
                        +{formatUsd(pos.pnl, 2)} ({pos.pnlPercent.toFixed(1)}%)
                      </span>
                      <button className={styles.actionButton}>Close</button>
                    </div>
                  ))
                )}
              </>
            )}
            {activePositionTab === "openOrders" && (
              <div className={styles.positionsEmpty}>No open orders</div>
            )}
            {activePositionTab === "tradeHistory" && (
              <>
                {trades.length === 0 ? (
                  <div className={styles.positionsEmpty}>No trades recorded yet.</div>
                ) : (
                  <>
                    <div className={styles.positionsTableHead}>
                      <span>Time</span>
                      <span>Side</span>
                      <span>Price</span>
                      <span>Amount</span>
                      <span>Total</span>
                      <span></span>
                      <span></span>
                    </div>
                    {trades.map((trade) => {
                      const price = trade.price ? Number(trade.price) : null;
                      let amountNum = 0;
                      let isBuy = false;
                      if (trade.amount0) {
                        try {
                          const raw = BigInt(trade.amount0);
                          amountNum = Math.abs(Number(raw) / Math.pow(10, activeMarket?.token0?.decimals || 18));
                          isBuy = raw > 0n;
                        } catch {
                          amountNum = 0;
                        }
                      }
                      return (
                        <div key={trade.id} className={styles.positionsTableRow}>
                          <span>{formatTime(trade.timestamp)}</span>
                          <span className={isBuy ? styles.sideLong : styles.sideShort}>
                            {isBuy ? "BUY" : "SELL"}
                          </span>
                          <span>{price ? formatUsd(price, 2) : "--"}</span>
                          <span>{amountNum.toFixed(4)} {activeMarket?.token0?.symbol}</span>
                          <span>{price ? formatUsd(amountNum * price, 2) : "--"}</span>
                          <span></span>
                          <span></span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
            {activePositionTab === "pnl" && (
              <div className={styles.positionsEmpty}>No realized PnL data</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Orderbook + Trade Form ──────── */}
      <div className={styles.sideColumn}>
        <div className={styles.orderbookSection}>
          <div className={styles.orderbookHeader}>
            <span>Price (USD)</span>
            <span>Size</span>
            <span>Total</span>
          </div>

          {/* Asks (reversed so highest price at top) */}
          <div className={styles.orderbookAsks}>
            {orderBook.asks.map((level, i) => (
              <div key={`ask-${i}`} className={styles.orderbookRow}>
                <span
                  className={styles.orderbookDepthBg + " " + styles.orderbookDepthBgAsk}
                  style={{ width: `${(level.total / maxTotal) * 100}%` }}
                />
                <span className={styles.askPrice}>{formatUsd(level.price, 2)}</span>
                <span className={styles.orderbookSize}>{level.size.toFixed(3)}</span>
                <span className={styles.orderbookTotal}>{level.total.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Spread */}
          <div className={styles.orderbookSpread}>
            <span className={styles.spreadPrice}>
              {latestPrice ? formatUsd(latestPrice, 2) : "--"}
            </span>
            <span className={styles.spreadLabel}>
              Spread: {spread ? spread.toFixed(2) : "--"}
            </span>
          </div>

          {/* Bids */}
          <div className={styles.orderbookBids}>
            {orderBook.bids.map((level, i) => (
              <div key={`bid-${i}`} className={styles.orderbookRow}>
                <span
                  className={styles.orderbookDepthBg + " " + styles.orderbookDepthBgBid}
                  style={{ width: `${(level.total / maxTotal) * 100}%` }}
                />
                <span className={styles.bidPrice}>{formatUsd(level.price, 2)}</span>
                <span className={styles.orderbookSize}>{level.size.toFixed(3)}</span>
                <span className={styles.orderbookTotal}>{level.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Form */}
        <div className={styles.tradeFormSection}>
          <div className={styles.tradeBoxTabs}>
            <button
              className={tradeSide === "buy" ? styles.tradeTabBuyActive : ""}
              onClick={() => setTradeSide("buy")}
            >
              Buy / Long
            </button>
            <button
              className={tradeSide === "sell" ? styles.tradeTabSellActive : ""}
              onClick={() => setTradeSide("sell")}
            >
              Sell / Short
            </button>
          </div>

          <div className={styles.orderTypeTabs}>
            {(["market", "limit", "stop"] as OrderType[]).map((t) => (
              <button
                key={t}
                className={`${styles.orderTypeTab} ${orderType === t ? styles.orderTypeTabActive : ""}`}
                onClick={() => setOrderType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className={styles.tradeFormGroup}>
            <label>Order Size (USD)</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputPrefix}>USD</span>
              <input type="number" placeholder="0.00" />
            </div>
          </div>

          <div className={styles.leverageSection}>
            <div className={styles.leverageHeader}>
              <span className={styles.leverageLabel}>Leverage</span>
              <span className={styles.leverageValue}>{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className={styles.leverageSlider}
            />
            <div className={styles.leverageMarks}>
              {LEVERAGE_MARKS.map((m) => (
                <button
                  key={m}
                  className={`${styles.leverageMark} ${leverage === m ? styles.leverageMarkActive : ""}`}
                  onClick={() => setLeverage(m)}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tradeBreakdown}>
            <div className={styles.breakdownRow}>
              <p>Entry Price</p>
              <strong>{latestPrice ? formatUsd(latestPrice, 2) : "--"}</strong>
            </div>
            <div className={`${styles.breakdownRow} ${styles.breakdownRowDanger}`}>
              <p>Liquidation Price</p>
              <strong>{latestPrice ? formatUsd(latestPrice * (tradeSide === "buy" ? 0.75 : 1.25), 2) : "--"}</strong>
            </div>
            <div className={styles.breakdownRow}>
              <p>Est. Fees</p>
              <strong>$1.20</strong>
            </div>
          </div>

          <button
            className={`${styles.submitOrderButton} ${tradeSide === "sell" ? styles.submitSellButton : ""}`}
          >
            Place {tradeSide === "buy" ? "Buy" : "Sell"} Order
          </button>

          <div className={styles.availableBalance}>
            <span>Available</span>
            <span>1,249.50 USDC</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TradingTerminal;
