import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import axios from "axios";
import { getAuthToken } from "../utils/auth";

// --- Constants (B담당 통화 리스트 반영) ---
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
    // 상태 제어
    isLoading: boolean;

    // 개인 지갑 (C담당 구조 + B담당 명칭 호환)
    hasPersonalAccount: boolean;
    personalAccount: string;
    personalBalances: Record<string, number>;
    userAccount: string; // Alias for B
    balances: Record<string, number>; // Alias for B

    // 기업 지갑 (C담당 구조 + B담당 명칭 호환)
    hasCorporateAccount: boolean;
    corporateAccount: string;
    corporateBalances: Record<string, number>;
    companyName: string;
    corpAccount: string; // Alias for B
    corpBalances: Record<string, number>; // Alias for B

    // 내역
    transactions: Transaction[];
    corpTransactions: Transaction[]; // Filtered for B

    // 메서드 (C담당 실결합 로직)
    fetchWalletData: () => Promise<void>;
    setPersonalAccount: (acc: string) => void;
    setCorporateAccount: (acc: string, name: string) => void;
    executeTransfer: (
        toAcc: string,
        amt: number,
        cur: string,
        rate: number,
        debit: number,
        credit: number,
        title: string,
        category: "PERSONAL" | "BUSINESS",
    ) => Promise<void>;
    chargeKrw: (amount: number, category: "PERSONAL" | "BUSINESS") => Promise<void>;
    activatePersonalWallet: (impUid: string) => Promise<void>;
    resetAccount: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [isLoading, setIsLoading] = useState(true);

    // 개인 상태
    const [personalAccount, setPersonalAccountState] = useState("");
    const [personalBalances, setPersonalBalances] = useState<Record<string, number>>({ KRW: 0 });

    // 기업 상태
    const [corporateAccount, setCorporateAccountState] = useState("");
    const [corporateBalances, setCorporateBalances] = useState<Record<string, number>>({ KRW: 0 });
    const [companyName, setCompanyName] = useState("");

    // 공통 내역
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const token = getAuthToken();

    // 🌟 [C담당 실결합] 서버 데이터 동기화
    const fetchWalletData = async () => {
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
            console.error("WalletContext: 데이터 로드 실패", error);
        } finally {
            setIsLoading(false); // 로딩 종료 (새로고침 이슈 해결 핵심)
        }
    };

    useEffect(() => {
        fetchWalletData();
    }, [token]);

    // 🌟 [C담당 실결합] 본인인증 및 지갑 활성화
    const activatePersonalWallet = async (impUid: string) => {
        if (!token) return;
        try {
            await axios.post(
                `${API_BASE_URL}/wallet/verify-identity`,
                { impUid },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            await fetchWalletData();
        } catch (error) {
            console.error("Wallet activation failed:", error);
            throw error;
        }
    };

    // 🌟 [C담당 실결합] 토스 페이먼츠 충전
    const chargeKrw = async (amount: number, category: "PERSONAL" | "BUSINESS") => {
        if (!token) return;
        try {
            const response = await axios.post(
                `${API_BASE_URL}/wallet/charge`,
                { amount, category },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            const { orderId, amount: resAmt, orderName, customerName, clientKey } = response.data;

            // @ts-ignore
            const tossPayments = (window as any).TossPayments(clientKey);
            await tossPayments.requestPayment("카드", {
                amount: resAmt,
                orderId,
                orderName,
                customerName,
                successUrl: `${window.location.origin}/wallet/success`,
                failUrl: `${window.location.origin}/wallet/fail`,
            });
        } catch (error) {
            console.error("Charge failed:", error);
        }
    };

    // 🌟 [C담당 실결합] 실제 서버 송금 실행
    const executeTransfer = async (
        toAccount: string,
        amount: number,
        currency: string,
        rate: number,
        debitAmount: number,
        creditAmount: number,
        title: string,
        category: "PERSONAL" | "BUSINESS",
    ) => {
        await axios.post(
            `${API_BASE_URL}/wallet/transfer`,
            { toAccount, amount, currency, rate, debitAmount, creditAmount, title, category },
            { headers: { Authorization: `Bearer ${token}` } },
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
                userAccount: personalAccount, // B담당 호환용
                balances: personalBalances, // B담당 호환용

                // 기업 (C구조 + B호환)
                hasCorporateAccount: !!corporateAccount,
                corporateAccount,
                corporateBalances,
                companyName,
                corpAccount: corporateAccount, // B담당 호환용
                corpBalances: corporateBalances, // B담당 호환용

                // 내역 필터링
                transactions,
                corpTransactions: transactions.filter(tx => tx.category === "BUSINESS"), // B담당 호환용

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
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) throw new Error("useWallet must be used within a WalletProvider");
    return context;
};