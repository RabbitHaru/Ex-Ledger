import React from 'react';

const ResourceLayout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="min-h-screen bg-slate-50 py-20 px-6">
        <div className="max-w-4xl mx-auto bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
            <header className="px-10 py-12 border-b border-slate-50 bg-slate-50/30">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
            </header>
            <div className="p-10 text-slate-600 leading-relaxed text-[15px] font-medium whitespace-pre-line">
                {children}
            </div>
        </div>
    </div>
);

export const TermsPage = () => (
    <ResourceLayout title="이용약관">
        {`제1조 (목적)
이 약관은 Ex-Ledger(이하 "회사"라 함)가 제공하는 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
1. "서비스"라 함은 구현되는 단말기(PC, 휴대형단말기 등의 각종 유무선 장치를 포함)와 상관없이 "회원"이 이용할 수 있는 Ex-Ledger 및 관련 제반 서비스를 의미합니다.
2. "회원"이라 함은 회사의 "서비스"에 접속하여 이 약관에 따라 "회사"와 이용계약을 체결하고 "회사"가 제공하는 "서비스"를 이용하는 고객을 말합니다.

제3조 (약관의 게시와 개정)
1. "회사"는 이 약관의 내용을 "회원"이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
2. "회사"는 "약관의 규제에 관한 법률", "정보통신망 이용촉진 및 정보보호 등에 관한 법률" 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.

(이하 생략...)`}
    </ResourceLayout>
);

export const PrivacyPage = () => (
    <ResourceLayout title="개인정보처리방침">
        {`Ex-Ledger는 사용자의 개인정보를 소중하게 생각하며, 관련 법령을 준수합니다.

1. 수집하는 개인정보 항목
- 필수항목: 이름, 이메일, 비밀번호, 본인확인 정보
- 기업회원: 사업자등록번호, 대표자명, 담당자 연락처

2. 개인정보의 수집 및 이용목적
- 서비스 제공에 따른 본인 식별 및 인증
- 서비스 부정 이용 방지 및 비인가 사용 방지
- 신규 서비스 개발 및 맞춤 서비스 제공

3. 개인정보의 보유 및 이용기간
이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. 단, 관련 법령에 의하여 보존할 필요가 있는 경우 정해진 기간 동안 보관합니다.`}
    </ResourceLayout>
);

export const NoticePage = () => (
    <ResourceLayout title="공지사항">
        <div className="space-y-8">
            <div className="pb-6 border-b border-slate-50">
                <h2 className="text-lg font-bold text-slate-800 mb-2">[안내] Ex-Ledger 서비스 정식 런칭 안내</h2>
                <p className="text-xs text-slate-400 mb-4">2026.03.11</p>
                <p>안녕하세요. Ex-Ledger 팀입니다. 드디어 차세대 핀테크 정산 플랫폼 Ex-Ledger가 정식 서비스를 시작합니다. 안전하고 빠른 정산 서비스를 경험해 보세요.</p>
            </div>
            <div className="pb-6 border-b border-slate-50">
                <h2 className="text-lg font-bold text-slate-800 mb-2">[점검] 시스템 정기 점검 안내 (03/15)</h2>
                <p className="text-xs text-slate-400 mb-4">2026.03.10</p>
                <p>보다 안정적인 서비스 제공을 위해 시스템 정기 점검이 예정되어 있습니다. 점검 시간 동안 서비스 이용이 일시 중단되오니 양해 부탁드립니다.</p>
            </div>
        </div>
    </ResourceLayout>
);

export const OperationPolicyPage = () => (
    <ResourceLayout title="운영정책">
        {`Ex-Ledger 서비스 운영 정책은 건전한 정산 생태계를 위해 작성되었습니다.

1. 계정 관리 정책
- 1인 1계정 원칙을 고수합니다.
- 타인의 정보를 도용하여 가입하는 경우 영구 정지 조치됩니다.

2. 정산 및 환전 정책
- 모든 정산 데이터는 시스템에 의해 실시간으로 기록됩니다.
- 부정 거래 징후 포착 시 정산이 일시 중단될 수 있습니다.

3. 서비스 이용 제한
- 시스템 공격, 비정상적인 접근 시도 시 IP 차단 및 법적 대응을 할 수 있습니다.`}
    </ResourceLayout>
);
