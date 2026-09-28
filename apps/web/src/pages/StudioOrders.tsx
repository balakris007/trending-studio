import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { formatINR, formatISTDateTime } from '@trending-studio/utils';
import {
  KanbanSquare,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  User,
  Phone,
  AlertCircle,
  X,
} from 'lucide-react';
import { OrderStatus, IOrder } from '@trending-studio/shared-types';

const STAGES = [
  { key: OrderStatus.CONFIRMED, label: 'Confirmed / Advance Paid', color: 'border-blue-500/50 bg-blue-500/5' },
  { key: OrderStatus.DESIGNING, label: 'Designing / Photo Edit', color: 'border-amber-500/50 bg-amber-500/5' },
  { key: OrderStatus.PRINTING, label: 'Lab Printing', color: 'border-pink-500/50 bg-pink-500/5' },
  { key: OrderStatus.FRAMING, label: 'Custom Framing', color: 'border-indigo-500/50 bg-indigo-500/5' },
  { key: OrderStatus.QUALITY_CHECK, label: 'Quality Check', color: 'border-purple-500/50 bg-purple-500/5' },
  { key: OrderStatus.READY, label: 'Ready for Pickup', color: 'border-emerald-500/50 bg-emerald-500/5' },
  { key: OrderStatus.DELIVERED, label: 'Delivered', color: 'border-slate-700 bg-slate-800/10' },
];

export const StudioOrders: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchOrders = async () => {
    try {
      const list = await dataService.getOrders();
      setOrders(list || []);
    } catch (err) {
      console.error('Failed to fetch studio orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAdvanceStage = async (order: IOrder, nextStage: OrderStatus) => {
    try {
      await dataService.updateOrderStatus(order._id || order.id || '', nextStage);
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const getNextStage = (current: OrderStatus): OrderStatus | null => {
    switch (current) {
      case OrderStatus.CONFIRMED:
      case OrderStatus.ADVANCE_PAID:
        return OrderStatus.DESIGNING;
      case OrderStatus.DESIGNING:
        return OrderStatus.PRINTING;
      case OrderStatus.PRINTING:
        return OrderStatus.FRAMING;
      case OrderStatus.FRAMING:
        return OrderStatus.QUALITY_CHECK;
      case OrderStatus.QUALITY_CHECK:
        return OrderStatus.READY;
      case OrderStatus.READY:
        return OrderStatus.DELIVERED;
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <KanbanSquare className="w-5 h-5 text-blue-400" />
            <span>Studio Production Kanban Board</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time stage tracking for customized photo prints, frames, and gifts
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
        >
          Refresh Board
        </button>
      </div>

      {/* Kanban Multi-Stage Columns Container */}
      <div className="flex-1 flex overflow-x-auto gap-3 pb-2 select-none">
        {STAGES.map((col) => {
          const stageOrders = orders.filter((o) => {
            if (col.key === OrderStatus.CONFIRMED) {
              return o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.ADVANCE_PAID;
            }
            return o.status === col.key;
          });

          return (
            <div
              key={col.key}
              className={`w-72 flex-shrink-0 flex flex-col rounded-2xl border ${col.color} bg-slate-900/60 overflow-hidden shadow-sm`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{col.label}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {stageOrders.length}
                </span>
              </div>

              {/* Cards in Column */}
              <div className="flex-1 p-2 overflow-y-auto space-y-2">
                {stageOrders.map((order) => {
                  const nextStage = getNextStage(order.status);

                  return (
                    <div
                      key={order._id || order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailModal(true);
                      }}
                      className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl p-3 cursor-pointer transition-all shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-blue-400">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            order.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {order.priority}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-semibold text-xs text-white">{order.customerName}</h4>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                          <Phone className="w-3 h-3 inline mr-1 text-slate-500" />
                          <span>{order.customerMobile}</span>
                        </p>
                      </div>

                      {/* Items Preview */}
                      <div className="text-[11px] text-slate-300 border-t border-slate-700/50 pt-1.5">
                        <p className="line-clamp-1">
                          {order.items?.map((it) => it.name).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="font-bold text-white">{formatINR(order.grandTotal)}</span>
                        {order.balanceDue > 0 ? (
                          <span className="text-amber-400 text-[10px]">
                            Due: {formatINR(order.balanceDue)}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-[10px] font-bold">PAID</span>
                        )}
                      </div>

                      {/* Advance Stage Shortcut */}
                      {nextStage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdvanceStage(order, nextStage);
                          }}
                          className="w-full mt-2 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors"
                        >
                          <span>Move to Next Stage</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {stageOrders.length === 0 && (
                  <div className="h-28 flex items-center justify-center text-slate-600 text-xs">
                    No orders in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ORDER DETAILS MODAL */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">
                  Order Details: {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-400">
                  Created {formatISTDateTime(selectedOrder.createdAt)}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl">
                <p className="font-bold text-white">{selectedOrder.customerName}</p>
                <p className="text-slate-400">Mobile: {selectedOrder.customerMobile}</p>
                <p className="text-blue-400 mt-1">Current Stage: {selectedOrder.status}</p>
              </div>

              <div>
                <p className="font-bold text-slate-300 mb-1">Order Items & Custom Specifications:</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <div className="flex justify-between font-semibold text-white">
                        <span>{it.name}</span>
                        <span>{formatINR(it.totalAmount)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Qty: {it.quantity} | Rate: {formatINR(it.unitPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                <span>Grand Total:</span>
                <span className="text-white">{formatINR(selectedOrder.grandTotal)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
