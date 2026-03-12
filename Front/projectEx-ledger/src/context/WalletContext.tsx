import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import axios from "axios";
import { getAuthToken } from "../utils/auth";

// --- Constants (수출입은행 지원 통화 리스트 통합) ---
export const SUPPORTED_CURRENCIES = [
    "KRW", "AED", "AUD", "BHD", "BND", "CAD", "CHF", "CNH", "DKK", "EUR",
    "GBP", "HKD", "IDR", "JPY", "KWD", "MYR", "NOK", "NZD", "SAR", "SEK",
    "SGD", "THB", "USD",
];

export interface Transaction {
    id: string;
    date: string;
    currency: string;
    amount: number;
    rate: number;
    finalKrw: number;
    status: "COMPLETED" | "WAITING" | "FAILED";
    title: string;
    type: "TRANSFER" | "CHARGE" | "EXCHANGE" | "INCOMING";
    category: "PERSONAL" | "BUSINESS";
}

interface WalletContextType {
    // 🌟 상태 제어 (새로고침 방어용)
    isLoading: boolean;

    // 개인 지갑 (C구조 + B호환)
    hasPersonalAccount: boolean;
    personalAccount: string;
    personalBalances: Record<string, number>;
    userAccount: string; // B담당 호환용 Alias
    balances: Record<string, number>; // B담당 호환용 Alias

    // 기업 지갑 (C구조 + B호환)
    hasCorporateAccount: boolean;
    corporateAccount: string;
    corporateBalances: Record<string, number>;
    companyName: string;
    corpAccount: string; // B담당 호환용 Alias
    corpBalances: Record<string, number>; // B담당 호환용 Alias

    // 내역
    transactions: Transaction[];
    corpTransactions: Transaction[]; // B담당 필터링 호환용

    // 🌟 실제 서버 API 메서드
    fetchWalletData: () => Promise<void>;
    setPersonalAccount: (acc: string) => void;
    setCorporateAccount: (acc: string, name: string) => void;
    executeTransfer: (
        toAcc: string, amt: number, cur: string, rate: number,
        debit: number, credit: number, title: string, category: "PERSONAL" | "BUSINESS"
    ) => Promise<void>;
    chargeKrw: (amount: number, category: "PERSONAL" | "BUSINESS") => Promise<void>;
    activatePersonalWallet: (impUid: string) => Promise<void>;
    resetAccount: () => void;
    setBusinessNumber: (bNo: string) => void; // B담당 프로필 동기화용
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [businessNumber, setBusinessNumberState] = useState("");

    // 개인 지갑 상태
    const [personalAccount, setPersonalAccountState] = useState("");
    const [personalBalances, setPersonalBalances] = useState<Record<string, number>>({ KRW: 0 });

    // 기업 지갑 상태
    const [corporateAccount, setCorporateAccountState] = useState("");
    const [corporateBalances, setCorporateBalances] = useState<Record<string, number>>({ KRW: 0 });
    const [companyName, setCompanyName] = useState("");

    // 공통 거래 내역
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // 🌟 [C담당 실결합] 서버 데이터 동기화 로직
    const fetchWalletData = async () => {
        const token = getAuthToken();
        if (!token) {
            setIsLoading(false);
            return;
        }
        try {
            const response = await axios.get(`${API_BASE_URL}/wallet/summary`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const { personal, corporate, txs } = response.data;

            if (personal) {
                setPersonalAccountState(personal.accountNumber || "");
                setPersonalBalances(personal.balances || { KRW: 0 });
            }

            if (corporate) {
                setCorporateAccountState(corporate.accountNumber || "");
                setCorporateBalances(corporate.balances || { KRW: 0 });
                setCompanyName(corporate.companyName || "");
            }

            setTransactions(txs || []);
        } catch (error) {
            console.error("WalletContext: 데이터 동기화 실패", error);
        } finally {
            setIsLoading(false); // 로딩 종료 -> UI 렌더링 허용
        }
    };

    useEffect(() => {
        fetchWalletData();
    }, []);

    // 본인인증 및 지갑 활성화
    const activatePersonalWallet = async (impUid: string) => {
        const token = getAuthToken();
        await axios.post(`${API_BASE_URL}/wallet/verify-identity`,
            { impUid },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        await fetchWalletData();
    };

    // 토스 페이먼츠 결제 충전
    const chargeKrw = async (amount: number, category: "PERSONAL" | "BUSINESS") => {
        const token = getAuthToken();
        const response = await axios.post(`${API_BASE_URL}/wallet/charge`,
            { amount, category },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const { amount: resAmt, orderId, orderName, customerName, clientKey } = response.data;

        // @ts-ignore
        const tossPayments = (window as any).TossPayments(clientKey);
        await tossPayments.requestPayment("카드", {
            amount: resAmt, orderId, orderName, customerName,
            successUrl: `${window.location.origin}/wallet/success`,
            failUrl: `${window.location.origin}/wallet/fail`,
        });
    };

    // 실제 서버 송금 실행
    const executeTransfer = async (
        toAccount: string, amount: number, currency: string, rate: number,
        debitAmount: number, creditAmount: number, title: string, category: "PERSONAL" | "BUSINESS"
    ) => {
        const token = getAuthToken();
        await axios.post(`${API_BASE_URL}/wallet/transfer`,
            { toAccount, amount, currency, rate, debitAmount, creditAmount, title, category },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        await fetchWalletData();
    };

    const resetAccount = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    return (
        <WalletContext.Provider
            value={{
                isLoading,

                // 개인 (C구조 + B호환)
                hasPersonalAccount: !!personalAccount,
                personalAccount,
                personalBalances,
                userAccount: personalAccount,
                balances: personalBalances,

                // 기업 (C구조 + B호환)
                hasCorporateAccount: !!corporateAccount,
                corporateAccount,
                corporateBalances,
                companyName,
                corpAccount: corporateAccount,
                corpBalances: corporateBalances,

                // 내역
                transactions,
                corpTransactions: transactions.filter(tx => tx.category === "BUSINESS"),

                // 메서드
                fetchWalletData,
                setPersonalAccount: setPersonalAccountState,
                setCorporateAccount: (acc, name) => {
                    setCorporateAccountState(acc);
                    setCompanyName(name);
                },
                executeTransfer,
                chargeKrw,
                activatePersonalWallet,
                resetAccount,
                setBusinessNumber: setBusinessNumberState
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) throw new Error("useWallet error");
    return context;
};