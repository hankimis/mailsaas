'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Mail, Phone, Edit, Trash2, MessageSquare } from 'lucide-react';
import type { User, UserRole } from '@/types/database';
import { formatPrice, PRICING } from '@/constants/pricing';

interface EmployeeTableProps {
  employees: User[];
  onToggleKakaoAlert: (userId: string, enabled: boolean) => Promise<void>;
  onEditEmployee: (employee: User) => void;
  onDeleteEmployee: (userId: string) => Promise<void>;
  isLoading?: boolean;
}

export function EmployeeTable({
  employees,
  onToggleKakaoAlert,
  onEditEmployee,
  onDeleteEmployee,
  isLoading,
}: EmployeeTableProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'kakao_enable' | 'kakao_disable' | 'delete';
    employee: User | null;
  }>({
    open: false,
    type: 'delete',
    employee: null,
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge variant="default" className="bg-primary text-primary-foreground">
            Super Admin
          </Badge>
        );
      case 'company_admin':
        return <Badge variant="secondary">관리자</Badge>;
      default:
        return <Badge variant="outline">직원</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        활성
      </Badge>
    ) : (
      <Badge variant="secondary">비활성</Badge>
    );
  };

  const handleKakaoToggle = async (employee: User, newValue: boolean) => {
    if (newValue && !employee.phone_verified) {
      // Show alert that phone verification is required
      alert('카카오 알림을 활성화하려면 먼저 휴대폰 인증이 필요합니다.');
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      type: newValue ? 'kakao_enable' : 'kakao_disable',
      employee,
    });
  };

  const handleConfirm = async () => {
    if (!confirmDialog.employee) return;

    setLoadingId(confirmDialog.employee.id);

    try {
      if (confirmDialog.type === 'delete') {
        await onDeleteEmployee(confirmDialog.employee.id);
      } else {
        const enabled = confirmDialog.type === 'kakao_enable';
        await onToggleKakaoAlert(confirmDialog.employee.id, enabled);
      }
    } finally {
      setLoadingId(null);
      setConfirmDialog({ open: false, type: 'delete', employee: null });
    }
  };

  const getConfirmDialogContent = () => {
    if (!confirmDialog.employee) return { title: '', description: '' };

    switch (confirmDialog.type) {
      case 'kakao_enable':
        return {
          title: '카카오 알림 활성화',
          description: `${confirmDialog.employee.full_name}님의 카카오 알림을 활성화하시겠습니까?\n\n월 ${formatPrice(PRICING.KAKAO_ALERT.AMOUNT)}가 추가로 청구됩니다.`,
        };
      case 'kakao_disable':
        return {
          title: '카카오 알림 비활성화',
          description: `${confirmDialog.employee.full_name}님의 카카오 알림을 비활성화하시겠습니까?`,
        };
      case 'delete':
        return {
          title: '직원 삭제',
          description: `${confirmDialog.employee.full_name}님을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 해당 직원의 이메일 계정도 함께 삭제됩니다.`,
        };
    }
  };

  const dialogContent = getConfirmDialogContent();

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">직원</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>카카오 알림</span>
                  <Badge variant="outline" className="ml-1 text-xs">
                    +{formatPrice(PRICING.KAKAO_ALERT.AMOUNT)}/월
                  </Badge>
                </div>
              </TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  등록된 직원이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={employee.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(employee.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{employee.full_name || '이름 없음'}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {employee.phone}
                            {employee.phone_verified && (
                              <Badge variant="outline" className="h-4 text-[10px]">
                                인증됨
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(employee.role)}</TableCell>
                  <TableCell>{getStatusBadge(employee.is_active)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={employee.kakao_alert_enabled}
                        onCheckedChange={(checked) => handleKakaoToggle(employee, checked)}
                        disabled={loadingId === employee.id || isLoading}
                        className="data-[state=checked]:bg-primary"
                      />
                      {employee.kakao_alert_enabled && (
                        <Badge className="bg-primary/10 text-primary">
                          ON
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditEmployee(employee)}>
                          <Edit className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              type: 'delete',
                              employee,
                            })
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmDialog.type === 'delete'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
