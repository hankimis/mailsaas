'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Copy,
  Download,
  Mail,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface DNSRecord {
  type: string;
  host: string;
  value: string;
  priority?: number;
  ttl: number;
}

interface DNSRequestFormProps {
  domain: string;
  dnsRecords: DNSRecord[];
  onAgencyInfoSubmit?: (info: {
    name: string;
    email: string;
    phone?: string;
  }) => Promise<void>;
}

export function DNSRequestForm({
  domain,
  dnsRecords,
  onAgencyInfoSubmit,
}: DNSRequestFormProps) {
  const [agencyInfo, setAgencyInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const generateRequestDocument = () => {
    const recordsText = dnsRecords
      .map((r) => {
        let line = `${r.type} 레코드\n`;
        line += `  호스트: ${r.host}\n`;
        if (r.priority !== undefined) {
          line += `  우선순위: ${r.priority}\n`;
        }
        line += `  값: ${r.value}\n`;
        line += `  TTL: ${r.ttl}`;
        return line;
      })
      .join('\n\n');

    return `
[DNS 설정 요청서]

안녕하세요,

아래 도메인에 대한 DNS 레코드 설정을 요청드립니다.
이메일 서비스 연동을 위해 필요한 설정입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
도메인: ${domain}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[필요한 DNS 레코드]

${recordsText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

설정 후 알려주시면 감사하겠습니다.
설정 확인까지 최대 24-48시간이 소요될 수 있습니다.

감사합니다.
    `.trim();
  };

  const copyToClipboard = async () => {
    const document = generateRequestDocument();
    await navigator.clipboard.writeText(document);
    toast.success('클립보드에 복사되었습니다');
  };

  const downloadDocument = () => {
    const document = generateRequestDocument();
    const blob = new Blob([document], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `DNS_요청서_${domain}.txt`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('다운로드가 시작되었습니다');
  };

  const handleSendRequest = async () => {
    if (!onAgencyInfoSubmit || !agencyInfo.name || !agencyInfo.email) {
      toast.error('관리 업체 정보를 입력해주세요');
      return;
    }

    setIsSending(true);
    try {
      await onAgencyInfoSubmit(agencyInfo);
      setIsSent(true);
      toast.success('요청서가 저장되었습니다');
    } catch {
      toast.error('저장에 실패했습니다');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* DNS Records Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            DNS 설정 정보
            <Badge variant="outline">필수</Badge>
          </CardTitle>
          <CardDescription>
            아래 DNS 레코드를 도메인 관리 업체에 요청해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border">
            <div className="grid grid-cols-5 gap-4 border-b bg-muted/50 p-3 text-sm font-medium">
              <div>타입</div>
              <div>호스트</div>
              <div>우선순위</div>
              <div className="col-span-2">값</div>
            </div>
            {dnsRecords.map((record, index) => (
              <div
                key={index}
                className="grid grid-cols-5 gap-4 border-b p-3 text-sm last:border-0"
              >
                <div>
                  <Badge variant="secondary">{record.type}</Badge>
                </div>
                <div className="font-mono text-xs">{record.host}</div>
                <div>{record.priority ?? '-'}</div>
                <div className="col-span-2 break-all font-mono text-xs">
                  {record.value}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={copyToClipboard}>
              <Copy className="mr-2 h-4 w-4" />
              요청서 복사
            </Button>
            <Button variant="outline" onClick={downloadDocument}>
              <Download className="mr-2 h-4 w-4" />
              요청서 다운로드
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agency Info Card */}
      {onAgencyInfoSubmit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              관리 업체 정보
              <Badge variant="outline">선택</Badge>
            </CardTitle>
            <CardDescription>
              관리 업체 정보를 입력하시면 DNS 설정 상태를 추적하고 알림을 받을 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSent ? (
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">정보가 저장되었습니다</p>
                  <p className="text-sm">DNS 설정이 완료되면 알림을 보내드립니다.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="agency-name">업체명</Label>
                    <Input
                      id="agency-name"
                      placeholder="ABC 호스팅"
                      value={agencyInfo.name}
                      onChange={(e) =>
                        setAgencyInfo((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agency-email">이메일</Label>
                    <Input
                      id="agency-email"
                      type="email"
                      placeholder="support@agency.com"
                      value={agencyInfo.email}
                      onChange={(e) =>
                        setAgencyInfo((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agency-phone">연락처 (선택)</Label>
                  <Input
                    id="agency-phone"
                    placeholder="02-1234-5678"
                    value={agencyInfo.phone}
                    onChange={(e) =>
                      setAgencyInfo((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
                <Button onClick={handleSendRequest} disabled={isSending}>
                  <Mail className="mr-2 h-4 w-4" />
                  {isSending ? '저장 중...' : '정보 저장'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-primary" />
            <div className="text-sm">
              <p className="font-medium">DNS 설정이 완료되기 전</p>
              <p className="mt-1 text-muted-foreground">
                DNS 설정이 완료되기 전까지 임시 이메일 주소를 사용하실 수 있습니다.
                임시 주소로 받은 메일은 DNS 설정 완료 후에도 유지됩니다.
              </p>
              <Separator className="my-3" />
              <p className="font-mono text-xs">
                임시 주소: <span className="text-primary">user@company.ourmail.co</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
