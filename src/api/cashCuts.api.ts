import { api } from './client'

export type CashCutRecord = {
  id: number
  openedAt: string
  fondoInicial: number
  totalEfectivo: number
  totalTarjeta: number
  totalTransferencia: number
  totalVentas: number
  efectivoEsperado: number
  efectivoContado: number | null
  diferencia: number | null
}

type CashCutResponse = { cut: {
  id: number; openedAt: string; fondoInicial: number | string;
  totalEfectivo?: number | string; totalTarjeta?: number | string;
  totalTransferencia?: number | string; totalVentas?: number | string;
  efectivoEsperado?: number | string; efectivoContado?: number | string | null; diferencia?: number | string | null;
} }

function normalize(cut: CashCutResponse['cut']): CashCutRecord {
  return {
    ...cut,
    fondoInicial: Number(cut.fondoInicial),
    totalEfectivo: Number(cut.totalEfectivo || 0),
    totalTarjeta: Number(cut.totalTarjeta || 0),
    totalTransferencia: Number(cut.totalTransferencia || 0),
    totalVentas: Number(cut.totalVentas || 0),
    efectivoEsperado: Number(cut.efectivoEsperado || 0),
    efectivoContado: cut.efectivoContado == null ? null : Number(cut.efectivoContado),
    diferencia: cut.diferencia == null ? null : Number(cut.diferencia),
  }
}

export async function getCurrentCashCut() {
  const result = await api<{ cut: CashCutResponse['cut'] | null }>('/cash-cuts/current')
  return result.cut ? normalize(result.cut) : null
}

export async function openCashCut(fondoInicial: number) {
  const result = await api<CashCutResponse>('/cash-cuts', { method: 'POST', body: JSON.stringify({ fondoInicial }) })
  return normalize(result.cut)
}

export async function closeCashCut(id: number, efectivoContado: number) {
  const result = await api<CashCutResponse>(`/cash-cuts/${id}/close`, { method: 'PATCH', body: JSON.stringify({ efectivoContado }) })
  return normalize(result.cut)
}
