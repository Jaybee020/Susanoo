import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import { parseEther } from "ethers";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  Candle,
  CandleTimeframe,
  PoolMarket,
  PoolTrade,
  relayerService,
} from "../../services/relayerService";
import { executeSwap } from "../../services/swapService";
import { orderService } from "../../services/orderService";
import { Order } from "../../services/limitOrder";
import { useWallet } from "../../contexts/WalletContext";
import { useFlashMessage } from "../../contexts/FlashMessageContext";
import {
  DEFAULT_DEPLOYED_POOL_ID,
  PERCENTAGE_OPTIONS,
  POOLKEY,
  OrderType,
  OrderStatus,
} from "../../utils/constants";
import { calculateTargetTick, tickToPrice } from "../../utils/priceConversion";
import styles from "./TradingTerminal.module.css";

const TIMEFRAMES: CandleTimeframe[] = ["15m", "1h", "4h", "1d"];

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

const formatAmount = (amount: bigint) => {
  try {
    return (Number(amount) / Math.pow(10, 18)).toFixed(6);
  } catch {
    return amount.toString();
  }
};

type PositionTab = "positions" | "openOrders" | "tradeHistory" | "pnl";
type TradeSide = "buy" | "sell";
type OrderTabType = "market" | "limit" | "stop";

interface DecryptedData {
  triggerTick: number;
  orderType: boolean;
}

const TradingTerminal: React.FC = () => {
  // ── Wallet & flash ─────────────────────────────────────
  const { address, isConnected, connect } = useWallet();
  const { showSuccess, showError } = useFlashMessage();

  // ── Market data state ───────────────────────────────────
  const [markets, setMarkets] = useState<PoolMarket[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>(DEFAULT_DEPLOYED_POOL_ID);
  const [timeframe, setTimeframe] = useState<CandleTimeframe>("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [trades, setTrades] = useState<PoolTrade[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI tab state ────────────────────────────────────────
  const [activePositionTab, setActivePositionTab] = useState<PositionTab>("positions");
  const [tradeSide, setTradeSide] = useState<TradeSide>("buy");
  const [orderTabType, setOrderTabType] = useState<OrderTabType>("market");

  // ── Trade form state ────────────────────────────────────
  const [tradeAmount, setTradeAmount] = useState("");
  const [limitPrivacyType, setLimitPrivacyType] = useState<"takeProfit" | "stopLoss">("takeProfit");
  const [limitPercentage, setLimitPercentage] = useState<number | null>(null);
  const [customLimitPct, setCustomLimitPct] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Orders state ────────────────────────────────────────
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [decryptedOrders, setDecryptedOrders] = useState<Map<string, DecryptedData>>(new Map());
  const [decryptingOrders, setDecryptingOrders] = useState<Set<string>>(new Set());

  // ── Balances ────────────────────────────────────────────
  const [token0Balance, setToken0Balance] = useState("--");
  const [token1Balance, setToken1Balance] = useState("--");

  // ── Chart refs ──────────────────────────────────────────
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  // ── Derived ─────────────────────────────────────────────
  const activeMarket = useMemo(
    () => markets.find((m) => m.poolId === selectedPool) || null,
    [markets, selectedPool]
  );

  const effectiveLimitType = orderTabType === "stop" ? "stopLoss" : limitPrivacyType;

  const currentTick = activeMarket?.currentTick ?? 0;

  const pctOptions =
    effectiveLimitType === "takeProfit"
      ? PERCENTAGE_OPTIONS.takeProfit
      : PERCENTAGE_OPTIONS.stopLoss;

  const effectivePct =
    limitPercentage !== null
      ? limitPercentage
      : customLimitPct
        ? parseFloat(customLimitPct)
        : 0;

  const targetTick =
    effectivePct > 0
      ? calculateTargetTick(currentTick, effectivePct, effectiveLimitType === "takeProfit")
      : null;

  const targetPrice = targetTick !== null ? tickToPrice(targetTick) : null;

  const activeOrders = userOrders.filter((o) => o.status === OrderStatus.Placed);

  // ── Token symbols ───────────────────────────────────────
  const token0Symbol = activeMarket?.token0?.symbol || "Token0";
  const token1Symbol = activeMarket?.token1?.symbol || "Token1";

  // Available balance label/value based on context
  const availableLabel =
    orderTabType === "market"
      ? tradeSide === "sell"
        ? token0Symbol
        : token1Symbol
      : token1Symbol; // limit orders always deposit token1 (zeroForOne = false)

  const availableBalance =
    orderTabType === "market"
      ? tradeSide === "sell"
        ? token0Balance
        : token1Balance
      : token1Balance;

  // ── Load markets ─────────────────────────────────────────
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

  // ── Load candles + trades ─────────────────────────────────
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

  // ── Create chart ──────────────────────────────────────────
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

  // ── Update chart data ─────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || !candles.length) return;
    const data = candles.map((c) => ({
      time: Math.floor(new Date(c.time).getTime() / 1000) as UTCTimestamp,
      value: Number(c.close),
    }));
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // ── Load orders + balances when wallet connects ───────────
  useEffect(() => {
    if (isConnected && address) {
      loadUserOrders();
      loadBalances();
    }
  }, [isConnected, address]);

  const loadUserOrders = useCallback(async () => {
    if (!address) return;
    setIsLoadingOrders(true);
    try {
      const orders = await orderService.getUserOrders(address);
      setUserOrders(orders);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [address]);

  const loadBalances = useCallback(async () => {
    if (!isConnected) return;
    try {
      const [b0, b1] = await Promise.all([
        orderService.getBalance(POOLKEY.currency0),
        orderService.getBalance(POOLKEY.currency1),
      ]);
      setToken0Balance(parseFloat(b0).toFixed(4));
      setToken1Balance(parseFloat(b1).toFixed(4));
    } catch (err) {
      console.error("Failed to load balances", err);
    }
  }, [isConnected]);

  // ── Market swap ───────────────────────────────────────────
  const handleMarketSwap = async () => {
    if (!isConnected || !tradeAmount || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const amount = parseEther(tradeAmount);
      const zeroForOne = tradeSide === "sell";
      const txHash = await executeSwap(POOLKEY, zeroForOne, amount);
      showSuccess(`Swap executed! TX: ${txHash.slice(0, 10)}...`);
      setTradeAmount("");
      loadBalances();
    } catch (err: any) {
      showError(err?.message || "Swap failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Private limit order ───────────────────────────────────
  const handleLimitOrder = async () => {
    if (!isConnected || !tradeAmount || isSubmitting) return;
    if (!effectivePct || effectivePct <= 0) {
      showError("Please select or enter a percentage target");
      return;
    }
    setIsSubmitting(true);
    try {
      const triggerTick = calculateTargetTick(
        currentTick,
        effectivePct,
        effectiveLimitType === "takeProfit"
      );
      const orderId = await orderService.createOrder({
        poolKey: POOLKEY,
        zeroForOne: false,
        triggerTick,
        orderType:
          effectiveLimitType === "takeProfit" ? OrderType.TakeProfit : OrderType.StopLoss,
        amount: parseEther(tradeAmount),
      });
      showSuccess(`Private order created! ID: ${orderId}`);
      setTradeAmount("");
      setLimitPercentage(null);
      setCustomLimitPct("");
      loadUserOrders();
      loadBalances();
    } catch (err: any) {
      showError(err?.message || "Failed to create limit order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Decrypt order ─────────────────────────────────────────
  const handleDecryptOrder = async (order: Order) => {
    if (decryptingOrders.has(order.orderId)) return;
    setDecryptingOrders((prev) => {
      const s = new Set(prev);
      s.add(order.orderId);
      return s;
    });
    try {
      const result = await orderService.decryptOrder(order.triggerTick, order.orderType);
      if (result) {
        setDecryptedOrders((prev) => new Map(prev).set(order.orderId, result));
        showSuccess("Order decrypted!");
      } else {
        showError("Failed to decrypt order data");
      }
    } catch (err: any) {
      showError("Decryption failed: " + err?.message);
    } finally {
      setDecryptingOrders((prev) => {
        const s = new Set(prev);
        s.delete(order.orderId);
        return s;
      });
    }
  };

  // ── Derived metrics ───────────────────────────────────────
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

  // ── Orderbook (simulated depth) ───────────────────────────
  const orderBook = useMemo(() => {
    if (!latestPrice)
      return {
        bids: [] as { price: number; size: number; total: number }[],
        asks: [] as { price: number; size: number; total: number }[],
      };

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

  // ── Helpers for status display ────────────────────────────
  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Placed: return "Active";
      case OrderStatus.Executed: return "Executed";
      case OrderStatus.Cancelled: return "Cancelled";
      default: return "Unknown";
    }
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Placed: return styles.orderStatusActive;
      case OrderStatus.Executed: return styles.orderStatusExecuted;
      case OrderStatus.Cancelled: return styles.orderStatusCancelled;
      default: return "";
    }
  };

  // ── Submit handler ────────────────────────────────────────
  const handleSubmit = () => {
    if (!isConnected) {
      connect();
      return;
    }
    if (orderTabType === "market") {
      handleMarketSwap();
    } else {
      handleLimitOrder();
    }
  };

  // ── Submit button label ───────────────────────────────────
  const submitLabel = () => {
    if (!isConnected) return "Connect Wallet";
    if (isSubmitting) return orderTabType === "market" ? "Swapping..." : "Placing Order...";
    if (orderTabType === "market") {
      return tradeSide === "buy" ? `Buy ${token0Symbol}` : `Sell ${token0Symbol}`;
    }
    if (orderTabType === "stop") return "Place Stop Loss Order";
    return effectiveLimitType === "takeProfit" ? "Place Take Profit Order" : "Place Stop Loss Order";
  };

  // ── Reset form when switching order types ─────────────────
  const handleOrderTabChange = (type: OrderTabType) => {
    setOrderTabType(type);
    setTradeAmount("");
    setLimitPercentage(null);
    setCustomLimitPct("");
  };

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
                    {market.token0?.symbol}-SPOT
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
                <span className={styles.pairType}>Spot</span>
              </div>

              <div className={styles.headerStatItem}>
                <span className={styles.headerStatLabel}>Index</span>
                <span className={styles.headerStatValue}>
                  {latestPrice ? formatUsd(latestPrice, 2) : "--"}
                </span>
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
              Positions
            </button>
            <button
              className={`${styles.positionsTab} ${activePositionTab === "openOrders" ? styles.positionsTabActive : ""}`}
              onClick={() => {
                setActivePositionTab("openOrders");
                if (isConnected && address) loadUserOrders();
              }}
            >
              Private Orders
              {activeOrders.length > 0 && (
                <span className={styles.positionsTabCount}>({activeOrders.length})</span>
              )}
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
              All Orders
            </button>
          </div>

          <div className={styles.positionsTable}>
            {/* Positions tab */}
            {activePositionTab === "positions" && (
              <div className={styles.positionsEmpty}>No open positions</div>
            )}

            {/* Private Orders tab */}
            {activePositionTab === "openOrders" && (
              <>
                {!isConnected ? (
                  <div className={styles.positionsEmpty}>
                    Connect your wallet to view private orders
                  </div>
                ) : isLoadingOrders ? (
                  <div className={styles.positionsEmpty}>
                    <LoadingSpinner size="small" />
                  </div>
                ) : activeOrders.length === 0 ? (
                  <div className={styles.positionsEmpty}>No active private orders</div>
                ) : (
                  <>
                    <div className={`${styles.positionsTableHead} ${styles.ordersTableHead}`}>
                      <span>Order #</span>
                      <span>Type (Encrypted)</span>
                      <span>Amount</span>
                      <span>Direction</span>
                      <span>Status</span>
                      <span>Decrypted Info</span>
                      <span>Action</span>
                    </div>
                    {activeOrders.map((order) => {
                      const decrypted = decryptedOrders.get(order.orderId);
                      const isDecrypting = decryptingOrders.has(order.orderId);
                      return (
                        <div key={order.orderId} className={`${styles.positionsTableRow} ${styles.ordersTableRow}`}>
                          <div className={styles.symbolCell}>
                            <span className={styles.orderIdBadge}>#{order.orderId}</span>
                          </div>
                          <span className={styles.encryptedBadge}>🔒 Private</span>
                          <span>{formatAmount(order.amount)}</span>
                          <span className={styles.sideLong}>
                            {order.zeroForOne ? `${token0Symbol}→${token1Symbol}` : `${token1Symbol}→${token0Symbol}`}
                          </span>
                          <span className={getStatusClass(order.status)}>
                            {getStatusLabel(order.status)}
                          </span>
                          <span className={styles.decryptedInfo}>
                            {decrypted ? (
                              <span className={styles.decryptedValue}>
                                {decrypted.orderType ? "Take Profit" : "Stop Loss"} @ tick {decrypted.triggerTick}
                              </span>
                            ) : (
                              <span className={styles.encryptedPlaceholder}>--</span>
                            )}
                          </span>
                          <span>
                            {!decrypted && (
                              <button
                                className={styles.decryptBtn}
                                onClick={() => handleDecryptOrder(order)}
                                disabled={isDecrypting}
                              >
                                {isDecrypting ? "..." : "Decrypt"}
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {/* Trade History tab */}
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

            {/* All Orders tab */}
            {activePositionTab === "pnl" && (
              <>
                {!isConnected ? (
                  <div className={styles.positionsEmpty}>Connect your wallet to view orders</div>
                ) : isLoadingOrders ? (
                  <div className={styles.positionsEmpty}><LoadingSpinner size="small" /></div>
                ) : userOrders.length === 0 ? (
                  <div className={styles.positionsEmpty}>No orders found</div>
                ) : (
                  <>
                    <div className={`${styles.positionsTableHead} ${styles.ordersTableHead}`}>
                      <span>Order #</span>
                      <span>Type (Encrypted)</span>
                      <span>Amount</span>
                      <span>Direction</span>
                      <span>Status</span>
                      <span>Decrypted Info</span>
                      <span>Action</span>
                    </div>
                    {userOrders.map((order) => {
                      const decrypted = decryptedOrders.get(order.orderId);
                      const isDecrypting = decryptingOrders.has(order.orderId);
                      return (
                        <div key={order.orderId} className={`${styles.positionsTableRow} ${styles.ordersTableRow}`}>
                          <div className={styles.symbolCell}>
                            <span className={styles.orderIdBadge}>#{order.orderId}</span>
                          </div>
                          <span className={styles.encryptedBadge}>🔒 Private</span>
                          <span>{formatAmount(order.amount)}</span>
                          <span className={styles.sideLong}>
                            {order.zeroForOne ? `${token0Symbol}→${token1Symbol}` : `${token1Symbol}→${token0Symbol}`}
                          </span>
                          <span className={getStatusClass(order.status)}>
                            {getStatusLabel(order.status)}
                          </span>
                          <span className={styles.decryptedInfo}>
                            {decrypted ? (
                              <span className={styles.decryptedValue}>
                                {decrypted.orderType ? "Take Profit" : "Stop Loss"} @ tick {decrypted.triggerTick}
                              </span>
                            ) : (
                              <span className={styles.encryptedPlaceholder}>--</span>
                            )}
                          </span>
                          <span>
                            {!decrypted && (
                              <button
                                className={styles.decryptBtn}
                                onClick={() => handleDecryptOrder(order)}
                                disabled={isDecrypting}
                              >
                                {isDecrypting ? "..." : "Decrypt"}
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
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

          {/* Asks */}
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

        {/* ── Trade Form ── */}
        <div className={styles.tradeFormSection}>
          {/* Buy / Sell tabs */}
          <div className={styles.tradeBoxTabs}>
            <button
              className={tradeSide === "buy" ? styles.tradeTabBuyActive : ""}
              onClick={() => setTradeSide("buy")}
            >
              Buy
            </button>
            <button
              className={tradeSide === "sell" ? styles.tradeTabSellActive : ""}
              onClick={() => setTradeSide("sell")}
            >
              Sell
            </button>
          </div>

          {/* Market / Limit / Stop tabs */}
          <div className={styles.orderTypeTabs}>
            {(["market", "limit", "stop"] as OrderTabType[]).map((t) => (
              <button
                key={t}
                className={`${styles.orderTypeTab} ${orderTabType === t ? styles.orderTypeTabActive : ""}`}
                onClick={() => handleOrderTabChange(t)}
              >
                {t === "market" ? "Market" : t === "limit" ? "Limit" : "Stop"}
              </button>
            ))}
          </div>

          {/* ── Market order form ── */}
          {orderTabType === "market" && (
            <>
              <div className={styles.tradeFormGroup}>
                <label>Amount ({tradeSide === "sell" ? token0Symbol : token1Symbol})</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>
                    {tradeSide === "sell" ? token0Symbol : token1Symbol}
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                </div>
              </div>

              <div className={styles.tradeBreakdown}>
                <div className={styles.breakdownRow}>
                  <p>Market Price</p>
                  <strong>{latestPrice ? formatUsd(latestPrice, 2) : "--"}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <p>Direction</p>
                  <strong className={tradeSide === "buy" ? styles.sideLong : styles.sideShort}>
                    {tradeSide === "buy"
                      ? `Buy ${token0Symbol} with ${token1Symbol}`
                      : `Sell ${token0Symbol} for ${token1Symbol}`}
                  </strong>
                </div>
                <div className={styles.breakdownRow}>
                  <p>Slippage</p>
                  <strong>Auto</strong>
                </div>
              </div>
            </>
          )}

          {/* ── Limit / Stop order form ── */}
          {(orderTabType === "limit" || orderTabType === "stop") && (
            <>
              {/* Take Profit / Stop Loss toggle — only for Limit tab */}
              {orderTabType === "limit" && (
                <div className={styles.limitTypeToggle}>
                  <button
                    className={`${styles.limitTypeBtn} ${limitPrivacyType === "takeProfit" ? styles.limitTypeBtnActive : ""}`}
                    onClick={() => { setLimitPrivacyType("takeProfit"); setLimitPercentage(null); }}
                  >
                    Take Profit
                  </button>
                  <button
                    className={`${styles.limitTypeBtn} ${limitPrivacyType === "stopLoss" ? styles.limitTypeBtnStopActive : ""}`}
                    onClick={() => { setLimitPrivacyType("stopLoss"); setLimitPercentage(null); }}
                  >
                    Stop Loss
                  </button>
                </div>
              )}

              {orderTabType === "stop" && (
                <div className={styles.orderTypeNote}>
                  Stop Loss — triggers when price drops
                </div>
              )}

              {/* Percentage selector */}
              <div className={styles.tradeFormGroup}>
                <label>
                  Trigger at ({effectiveLimitType === "takeProfit" ? "+" : "-"}%)
                </label>
                <div className={styles.pctGrid}>
                  {pctOptions.map((pct) => (
                    <button
                      key={pct}
                      className={`${styles.pctBtn} ${limitPercentage === pct ? styles.pctBtnActive : ""}`}
                      onClick={() => { setLimitPercentage(pct); setCustomLimitPct(""); }}
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    className={`${styles.pctBtn} ${limitPercentage === null && customLimitPct ? styles.pctBtnActive : ""}`}
                    onClick={() => setLimitPercentage(null)}
                  >
                    Custom
                  </button>
                </div>

                {limitPercentage === null && (
                  <div className={styles.inputWrapper} style={{ marginTop: "0.4rem" }}>
                    <span className={styles.inputPrefix}>%</span>
                    <input
                      type="number"
                      placeholder="e.g. 7.5"
                      value={customLimitPct}
                      onChange={(e) => setCustomLimitPct(e.target.value)}
                      min="0.1"
                      max="100"
                      step="0.1"
                    />
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className={styles.tradeFormGroup}>
                <label>Amount ({token1Symbol} to deposit)</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>{token1Symbol}</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div className={styles.tradeBreakdown}>
                <div className={styles.breakdownRow}>
                  <p>Current Tick</p>
                  <strong>{currentTick || "--"}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <p>Target Price</p>
                  <strong className={effectiveLimitType === "takeProfit" ? styles.pnlPositive : styles.pnlNegative}>
                    {targetPrice ? formatUsd(targetPrice, 4) : "--"}
                  </strong>
                </div>
                <div className={styles.breakdownRow}>
                  <p>Order Type</p>
                  <strong className={styles.encryptedBadge}>🔒 Private (FHE)</strong>
                </div>
              </div>
            </>
          )}

          {/* Submit button */}
          <button
            className={`${styles.submitOrderButton} ${tradeSide === "sell" && orderTabType === "market" ? styles.submitSellButton : ""} ${orderTabType !== "market" ? styles.submitLimitButton : ""}`}
            onClick={handleSubmit}
            disabled={isSubmitting || (isConnected && !tradeAmount)}
          >
            {submitLabel()}
          </button>

          {/* Available balance */}
          <div className={styles.availableBalance}>
            <span>Available ({availableLabel})</span>
            <span>{availableBalance}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TradingTerminal;
