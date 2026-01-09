'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Loader2, MessageSquare, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { addEmployeeSchema, type AddEmployeeInput } from '@/lib/validations/auth';
import { formatPrice, PRICING } from '@/constants/pricing';
import { toast } from 'sonner';

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyDomain: string;
  companyId: string;
}

interface InvitationResult {
  inviteUrl: string;
  email: string;
  kakaoSent: boolean;
}

export function AddEmployeeDialog({
  open,
  onOpenChange,
  companyDomain,
  companyId,
}: AddEmployeeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [invitationResult, setInvitationResult] = useState<InvitationResult | null>(null);

  const form = useForm<AddEmployeeInput>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      email: '',
      full_name: '',
      phone: '',
      role: 'employee',
      kakao_alert_enabled: false,
    },
  });

  const handleSubmit = async (data: AddEmployeeInput) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          company_id: companyId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || '초대 생성에 실패했습니다');
        return;
      }

      setInvitationResult({
        inviteUrl: result.invitation.inviteUrl,
        email: result.invitation.email,
        kakaoSent: result.kakao.success,
      });

      if (result.kakao.success) {
        toast.success('초대 링크가 카카오톡으로 발송되었습니다');
      } else {
        toast.warning('초대가 생성되었지만 카카오톡 발송에 실패했습니다');
      }

      form.reset();
    } catch (error) {
      console.error('Invitation error:', error);
      toast.error('오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!invitationResult?.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(invitationResult.inviteUrl);
      toast.success('초대 링크가 복사되었습니다');
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

  const handleClose = () => {
    setInvitationResult(null);
    form.reset();
    onOpenChange(false);
  };

  const emailValue = form.watch('email');
  const kakaoAlertEnabled = form.watch('kakao_alert_enabled');

  // Generate email preview
  const emailPreview = emailValue
    ? `${emailValue.split('@')[0]}@${companyDomain}`
    : `username@${companyDomain}`;

  // Success view
  if (invitationResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center">초대가 발송되었습니다!</DialogTitle>
            <DialogDescription className="text-center">
              {invitationResult.kakaoSent
                ? '직원에게 카카오톡으로 초대 링크가 발송되었습니다.'
                : '초대 링크가 생성되었습니다. 아래 링크를 직접 공유해주세요.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm text-muted-foreground">이메일</p>
              <p className="font-medium">{invitationResult.email}</p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm text-muted-foreground">초대 링크</p>
              <div className="flex items-center gap-2">
                <Input
                  value={invitationResult.inviteUrl}
                  readOnly
                  className="text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {invitationResult.kakaoSent && (
              <Alert className="bg-primary/10 border-primary/20">
                <MessageSquare className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">카카오톡 발송 완료</AlertTitle>
                <AlertDescription>
                  직원의 휴대폰으로 초대 링크가 카카오톡으로 발송되었습니다.
                </AlertDescription>
              </Alert>
            )}

            {!invitationResult.kakaoSent && (
              <Alert variant="destructive">
                <AlertTitle>카카오톡 발송 실패</AlertTitle>
                <AlertDescription>
                  카카오톡 발송에 실패했습니다. 위의 초대 링크를 직접 공유해주세요.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(invitationResult.inviteUrl, '_blank')}
              className="w-full sm:w-auto"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              링크 열기
            </Button>
            <Button onClick={handleClose} className="w-full sm:w-auto">
              완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>직원 초대</DialogTitle>
          <DialogDescription>
            직원을 초대하면 카카오톡으로 계정 활성화 링크가 발송됩니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="홍길동" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>휴대폰 번호 *</FormLabel>
                  <FormControl>
                    <Input placeholder="010-1234-5678" {...field} />
                  </FormControl>
                  <FormDescription>
                    이 번호로 카카오톡 초대 링크가 발송됩니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일 ID *</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input placeholder="username" {...field} />
                      <span className="text-muted-foreground whitespace-nowrap">@{companyDomain}</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    생성될 이메일: <span className="font-medium">{emailPreview}</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>역할</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="역할 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="employee">직원</SelectItem>
                      <SelectItem value="company_admin">관리자</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    관리자는 직원 관리 및 결제 설정을 할 수 있습니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kakao_alert_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      카카오 메일 알림
                      <Badge variant="outline" className="ml-2">
                        +{formatPrice(PRICING.KAKAO_ALERT.AMOUNT)}/월
                      </Badge>
                    </FormLabel>
                    <FormDescription>
                      새 메일 도착 시 카카오톡으로 알림을 받습니다.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {kakaoAlertEnabled && (
              <div className="rounded-lg bg-primary/10 p-4 text-sm">
                <p className="font-medium text-primary">추가 비용 안내</p>
                <p className="mt-1 text-muted-foreground">
                  카카오 알림 활성화 시 월 {formatPrice(PRICING.KAKAO_ALERT.AMOUNT)}가
                  추가로 청구됩니다.
                </p>
              </div>
            )}

            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertTitle>카카오톡 초대</AlertTitle>
              <AlertDescription>
                직원 추가 시 입력한 휴대폰 번호로 카카오톡 초대 링크가 발송됩니다.
                직원은 해당 링크에서 비밀번호를 설정하고 계정을 활성화할 수 있습니다.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                초대 발송
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
