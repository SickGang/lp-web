import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { chemicalsAPI } from '../services/api';
import './Chemistry.css';

interface Chemical {
  id: number;
  name: string;
  brand: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  currentStock: number;
  minStock: number;
}

interface ChemicalUsage {
  id: number;
  chemicalName: string;
  quantity: number;
  cost: number;
  recordedAt: string;
  recordedBy: string;
  notes?: string;
}

const Chemistry = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'usage'>('inventory');
  // const [showAddModal, setShowAddModal] = useState(false);

  // Загружаем химию из API
  const { data: chemicalsData, isLoading: chemicalsLoading, isError: chemicalsError } = useQuery({
    queryKey: ['chemicals'],
    queryFn: async () => {
      const response = await chemicalsAPI.getAll();
      return response.data;
    },
    retry: 1,
  });

  // Загружаем историю расхода
  const { data: usageData, isLoading: usageLoading, isError: usageError } = useQuery({
    queryKey: ['chemical-usage'],
    queryFn: async () => {
      const response = await chemicalsAPI.getUsageHistory({ limit: 50 });
      return response.data;
    },
    retry: 1,
  });

  // Загружаем статистику за месяц
  const { data: statsData } = useQuery({
    queryKey: ['chemical-stats'],
    queryFn: async () => {
      const today = new Date();
      const monthStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
      const monthEnd = endOfMonth(today);
      const response = await chemicalsAPI.getUsageStats(
        monthStart.toISOString(),
        monthEnd.toISOString()
      );
      return response.data;
    },
  });

  const chemicals: Chemical[] = chemicalsData || [];

  const usageHistory: ChemicalUsage[] = usageData?.map((usage: any) => ({
    id: usage.id,
    chemicalName: usage.chemical.name,
    quantity: usage.quantity,
    cost: usage.cost,
    recordedAt: usage.recordedAt,
    recordedBy: usage.user.name || usage.user.phone,
    notes: usage.notes,
  })) || [];

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'shampoo': return 'Шампунь';
      case 'wax': return 'Воск';
      case 'polish': return 'Полироль';
      case 'tire_cleaner': return 'Очиститель дисков';
      case 'interior_cleaner': return 'Очиститель салона';
      default: return 'Прочее';
    }
  };

  return (
    <div className="chemistry-page">
      <div className="chemistry-header">
        <h1>Учет химии</h1>
        <button className="add-chemical-btn" onClick={() => setShowAddModal(true)}>
          + Добавить химию
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Склад
        </button>
        <button
          className={`tab ${activeTab === 'usage' ? 'active' : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          📊 История расхода
        </button>
      </div>

      {activeTab === 'inventory' && (
        chemicalsLoading ? (
          <p>Загрузка...</p>
        ) : chemicalsError ? (
          <p>Ошибка загрузки данных. Убедитесь, что API сервер запущен.</p>
        ) : (
          <div className="inventory-grid">
          {chemicals.map((chemical) => {
            const isLowStock = chemical.currentStock <= chemical.minStock;
            return (
              <div key={chemical.id} className={`chemical-card ${isLowStock ? 'low-stock' : ''}`}>
                <div className="chemical-header">
                  <h3>{chemical.name}</h3>
                  {isLowStock && <span className="low-stock-badge">⚠️ Мало</span>}
                </div>
                <p className="chemical-brand">{chemical.brand}</p>
                <p className="chemical-category">{getCategoryLabel(chemical.category)}</p>
                <div className="chemical-stock">
                  <div className="stock-info">
                    <span className="stock-label">Остаток:</span>
                    <span className="stock-value">{chemical.currentStock} {chemical.unit}</span>
                  </div>
                  <div className="stock-info">
                    <span className="stock-label">Цена:</span>
                    <span className="stock-value">{(chemical.pricePerUnit / 100).toLocaleString('ru-RU')} ₽/{chemical.unit}</span>
                  </div>
                </div>
                <div className="chemical-actions">
                  <button className="record-usage-btn">Записать расход</button>
                  <button className="edit-btn">Изменить</button>
                </div>
              </div>
            );
          })}
          </div>
        )
      )}

      {activeTab === 'usage' && (
        usageLoading ? (
          <p>Загрузка...</p>
        ) : usageError ? (
          <p>Ошибка загрузки данных. Убедитесь, что API сервер запущен.</p>
        ) : (
          <div className="usage-section">
            <div className="usage-stats">
              <div className="stat-box">
                <div className="stat-label">Расход за месяц</div>
                <div className="stat-value">{((statsData?.totalCost || 0) / 100).toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Записей расхода</div>
                <div className="stat-value">{statsData?.recordsCount || 0}</div>
              </div>
            </div>

          <div className="usage-table">
            <table>
              <thead>
                <tr>
                  <th>Дата и время</th>
                  <th>Химия</th>
                  <th>Количество</th>
                  <th>Стоимость</th>
                  <th>Записал</th>
                  <th>Заметки</th>
                </tr>
              </thead>
              <tbody>
                {usageHistory.map((usage) => (
                  <tr key={usage.id}>
                    <td>{format(new Date(usage.recordedAt), 'd MMM yyyy, HH:mm', { locale: ru })}</td>
                    <td className="chemical-name">{usage.chemicalName}</td>
                    <td>{usage.quantity}</td>
                    <td className="cost">{(usage.cost / 100).toLocaleString('ru-RU')} ₽</td>
                    <td>{usage.recordedBy}</td>
                    <td className="notes">{usage.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Chemistry;
