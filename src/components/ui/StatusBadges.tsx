import { Badge } from './Badge';
import type { AssetStatus, AssetCondition, WarrantyStatus, RepairStatus, DisposalStatus, ProcurementStatus } from '@/types';
import {
  getStatusBadgeClass,
  getConditionBadgeClass,
  getWarrantyBadgeClass,
  getRepairBadgeClass,
  getDisposalBadgeClass,
  getProcurementBadgeClass,
} from '@/lib/utils';

export function StatusBadge({ status }: { status: AssetStatus }) {
  return <Badge className={getStatusBadgeClass(status)}>{status}</Badge>;
}

export function ConditionBadge({ condition }: { condition: AssetCondition }) {
  return <Badge className={getConditionBadgeClass(condition)}>{condition}</Badge>;
}

export function WarrantyBadge({ status }: { status: WarrantyStatus }) {
  return <Badge className={getWarrantyBadgeClass(status)}>{status}</Badge>;
}

export function RepairBadge({ status }: { status: RepairStatus }) {
  return <Badge className={getRepairBadgeClass(status)}>{status}</Badge>;
}

export function DisposalBadge({ status }: { status: DisposalStatus }) {
  return <Badge className={getDisposalBadgeClass(status)}>{status}</Badge>;
}

export function ProcurementBadge({ status }: { status: ProcurementStatus }) {
  return <Badge className={getProcurementBadgeClass(status)}>{status}</Badge>;
}
