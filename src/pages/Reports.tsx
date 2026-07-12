import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import {
  Box,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  TableContainer,
} from "@chakra-ui/react";
import { adminAPI } from "../services/api";
import { Button } from "@/components/ui/button";
import { formatRub, getPaymentStatusLabel } from "@/lib/reportFormat";

type PeriodPreset = "today" | "week" | "month" | "custom";

type ReportData = {
  period: { from: string; to: string };
  revenue: { total: number; ordersCount: number; averageCheck: number };
  byPayment: {
    cash: number;
    card: number;
    deposit: number;
    partialPaid: number;
    unpaid: number;
  };
  debts: {
    total: number;
    count: number;
    items: Array<{
      bookingId: number;
      clientName: string;
      phone?: string | null;
      debtAmount: number;
      closedAt: string;
    }>;
  };
  additionalServices: { total: number; itemsCount: number };
  deposits: { toppedUp: number; withdrawn: number; totalBalance: number };
  orders: Array<{
    id: number;
    closedAt: string;
    clientName: string;
    phone?: string | null;
    finalTotal: number;
    paidAmount: number;
    paymentStatus: string;
    debtAmount: number;
  }>;
};

function presetRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  if (preset === "today") {
    const key = format(now, "yyyy-MM-dd");
    return { from: key, to: key };
  }
  if (preset === "week") {
    return {
      from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  return {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Box
      bg="lp.surface"
      border="1px solid"
      borderColor="lp.border"
      borderRadius="16px"
      p={4}
    >
      <Text fontSize="sm" color="lp.textMuted" mb={1}>
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color="lp.textPrimary">
        {value}
      </Text>
      {hint && (
        <Text fontSize="xs" color="lp.textSecondary" mt={1}>
          {hint}
        </Text>
      )}
    </Box>
  );
}

const Reports = () => {
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const initial = presetRange("month");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const applyPreset = (next: PeriodPreset) => {
    setPreset(next);
    if (next !== "custom") {
      const range = presetRange(next);
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const queryKey = useMemo(() => ["admin-reports", from, to], [from, to]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await adminAPI.getReports(from, to);
      return res.data as ReportData;
    },
    enabled: Boolean(from && to),
  });

  const periodLabel =
    data != null
      ? `${format(new Date(data.period.from), "d MMM yyyy", { locale: ru })} – ${format(new Date(data.period.to), "d MMM yyyy", { locale: ru })}`
      : "";

  return (
    <Box>
      <Heading size="lg" mb={1} color="lp.textPrimary">
        Отчёты
      </Heading>
      <Text color="lp.textSecondary" fontSize="sm" mb={6}>
        Бухгалтерская сводка по закрытым заказам
      </Text>

      <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4} wrap="wrap">
        <HStack spacing={2} wrap="wrap">
          {(
            [
              ["today", "Сегодня"],
              ["week", "Неделя"],
              ["month", "Месяц"],
              ["custom", "Свой период"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={preset === key ? "default" : "outline"}
              className={
                preset === key
                  ? "bg-[#D9E57F] text-[#17181C] hover:bg-[#c7d76b]"
                  : ""
              }
              onClick={() => applyPreset(key)}
            >
              {label}
            </Button>
          ))}
        </HStack>
        <HStack spacing={2}>
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setPreset("custom");
              setFrom(e.target.value);
            }}
            maxW="160px"
          />
          <Text color="lp.textMuted">—</Text>
          <Input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              setPreset("custom");
              setTo(e.target.value);
            }}
            maxW="160px"
          />
        </HStack>
      </Stack>

      {isLoading ? (
        <Text color="lp.textSecondary">Загрузка...</Text>
      ) : isError ? (
        <Text color="lp.error">Не удалось загрузить отчёт</Text>
      ) : data ? (
        <>
          <Text fontSize="sm" color="lp.textMuted" mb={4}>
            Период: {periodLabel}
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={6}>
            <StatCard
              label="Выручка"
              value={formatRub(data.revenue.total)}
              hint={`${data.revenue.ordersCount} заказов`}
            />
            <StatCard
              label="Средний чек"
              value={formatRub(data.revenue.averageCheck)}
            />
            <StatCard
              label="Долги клиентов"
              value={formatRub(data.debts.total)}
              hint={
                data.debts.count > 0
                  ? `${data.debts.count} заказов`
                  : "нет задолженностей"
              }
            />
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
            <Box
              bg="lp.surface"
              border="1px solid"
              borderColor="lp.border"
              borderRadius="16px"
              p={4}
            >
              <Heading size="sm" mb={3} color="lp.textPrimary">
                По способам оплаты
              </Heading>
              <Stack spacing={2} fontSize="sm">
                {[
                  ["Наличные", data.byPayment.cash],
                  ["Карта", data.byPayment.card],
                  ["С депозита", data.byPayment.deposit],
                  ["Частично (оплачено)", data.byPayment.partialPaid],
                ].map(([label, amount]) => (
                  <HStack key={label as string} justify="space-between">
                    <Text color="lp.textSecondary">{label}</Text>
                    <Text color="lp.textPrimary" fontWeight="medium">
                      {formatRub(amount as number)}
                    </Text>
                  </HStack>
                ))}
              </Stack>
            </Box>

            <Box
              bg="lp.surface"
              border="1px solid"
              borderColor="lp.border"
              borderRadius="16px"
              p={4}
            >
              <Heading size="sm" mb={3} color="lp.textPrimary">
                Депозиты и доп. услуги
              </Heading>
              <Stack spacing={2} fontSize="sm">
                {[
                  ["Доп. услуги при закрытии", data.additionalServices.total],
                  ["Пополнено депозитов", data.deposits.toppedUp],
                  ["Списано с депозитов", data.deposits.withdrawn],
                  ["Остаток на депозитах", data.deposits.totalBalance],
                ].map(([label, amount]) => (
                  <HStack key={label as string} justify="space-between">
                    <Text color="lp.textSecondary">{label}</Text>
                    <Text color="lp.textPrimary" fontWeight="medium">
                      {formatRub(amount as number)}
                    </Text>
                  </HStack>
                ))}
              </Stack>
              <Text fontSize="xs" color="lp.textMuted" mt={3}>
                Пополнения депозита — авансы клиентов, не выручка. Остаток —
                обязательство перед клиентами.
              </Text>
            </Box>
          </SimpleGrid>

          {data.debts.items.length > 0 && (
            <Box mb={6}>
              <Heading size="sm" mb={3} color="lp.textPrimary">
                Долги
              </Heading>
              <TableContainer
                bg="lp.surface"
                borderRadius="16px"
                borderWidth="1px"
                borderColor="lp.border"
                overflowX="auto"
              >
                <Table size="sm">
                  <Thead bg="lp.input">
                    <Tr>
                      <Th color="lp.textMuted">Заказ</Th>
                      <Th color="lp.textMuted">Клиент</Th>
                      <Th color="lp.textMuted">Дата</Th>
                      <Th color="lp.textMuted" isNumeric>
                        Долг
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.debts.items.map((item) => (
                      <Tr key={item.bookingId}>
                        <Td color="lp.textPrimary">#{item.bookingId}</Td>
                        <Td color="lp.textSecondary">
                          {item.clientName}
                          {item.phone ? ` · ${item.phone}` : ""}
                        </Td>
                        <Td color="lp.textSecondary">
                          {format(new Date(item.closedAt), "d MMM yyyy", {
                            locale: ru,
                          })}
                        </Td>
                        <Td color="lp.textPrimary" isNumeric>
                          {formatRub(item.debtAmount)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Heading size="sm" mb={3} color="lp.textPrimary">
            Закрытые заказы
          </Heading>
          {data.orders.length === 0 ? (
            <Text color="lp.textSecondary">За период закрытых заказов нет</Text>
          ) : (
            <TableContainer
              bg="lp.surface"
              borderRadius="16px"
              borderWidth="1px"
              borderColor="lp.border"
              overflowX="auto"
            >
              <Table size="sm" minW="760px">
                <Thead bg="lp.input">
                  <Tr>
                    <Th color="lp.textMuted">#</Th>
                    <Th color="lp.textMuted">Дата</Th>
                    <Th color="lp.textMuted">Клиент</Th>
                    <Th color="lp.textMuted">Итог</Th>
                    <Th color="lp.textMuted">Оплачено</Th>
                    <Th color="lp.textMuted">Оплата</Th>
                    <Th color="lp.textMuted" isNumeric>
                      Долг
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.orders.map((order) => (
                    <Tr key={order.id}>
                      <Td color="lp.textPrimary">{order.id}</Td>
                      <Td color="lp.textSecondary">
                        {format(new Date(order.closedAt), "d MMM yyyy HH:mm", {
                          locale: ru,
                        })}
                      </Td>
                      <Td color="lp.textSecondary">
                        {order.clientName}
                        {order.phone ? ` · ${order.phone}` : ""}
                      </Td>
                      <Td color="lp.textSecondary">
                        {formatRub(order.finalTotal)}
                      </Td>
                      <Td color="lp.textPrimary">
                        {formatRub(order.paidAmount)}
                      </Td>
                      <Td color="lp.textSecondary">
                        {getPaymentStatusLabel(order.paymentStatus)}
                      </Td>
                      <Td
                        color={order.debtAmount > 0 ? "lp.error" : "lp.textMuted"}
                        isNumeric
                      >
                        {order.debtAmount > 0
                          ? formatRub(order.debtAmount)
                          : "—"}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </>
      ) : null}
    </Box>
  );
};

export default Reports;
