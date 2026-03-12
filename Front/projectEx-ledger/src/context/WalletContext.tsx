import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import axios from "axios";
import { getAuthToken } from "../utils/auth";

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
  isLoading: boolean;
  hasPersonalAccount: boolean;
  personalAccount: string;
  personalBalances: Record<string, number>;
  hasCorporateAccount: boolean;
  corporateAccount: string;
  corporateBalances: Record<string, number>;
  companyName: string;
  transactions: Transaction[];
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
  chargeKrw: (
    amount: number,
    category: "PERSONAL" | "BUSINESS",
  ) => Promise<void>;
  activatePersonalWallet: (impUid: string) => Promise<void>;
  resetAccount: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [personalAccount, setPersonalAccountState] = useState("");
  const [personalBalances, setPersonalBalances] = useState<
    Record<string, number>
  >({ KRW: 0 });
  const [corporateAccount, setCorporateAccountState] = useState("");
  const [corporateBalances, setCorporateBalances] = useState<
    Record<string, number>
  >({ KRW: 0 });
  const [companyName, setCompanyName] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const token = getAuthToken();

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
      console.error("데이터 로드 실패 (500 에러 확인 필요):", error);
    } finally {
      setIsLoading(false); // 🌟 무조건 로딩 종료하여 UI 렌더링을 결정하게 함
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [token]);

  const activatePersonalWallet = async (impUid: string) => {
    if (!token) return;
    try {
      await axios.post(
        `${API_BASE_URL}/wallet/verify-identity`,
        { impUid },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      await fetchWalletData();
    } catch (error) {
      console.error("Wallet activation failed:", error);
      throw error;
    }
  };

  const chargeKrw = async (
    amount: number,
    category: "PERSONAL" | "BUSINESS",
  ) => {
    if (!token) return;
    try {
      const response = await axios.post(
        `${API_BASE_URL}/wallet/charge`,
        { amount, category },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const {
        orderId,
        amount: resAmt,
        orderName,
        customerName,
        clientKey,
      } = response.data;
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
      {
        toAccount,
        amount,
        currency,
        rate,
        debitAmount,
        creditAmount,
        title,
        category,
      },
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
        hasPersonalAccount: !!personalAccount,
        personalAccount,
        personalBalances,
        hasCorporateAccount: !!corporateAccount,
        corporateAccount,
        corporateBalances,
        companyName,
        transactions,
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
  if (!context)
    throw new Error("useWallet must be used within a WalletProvider");
  return context;
};
