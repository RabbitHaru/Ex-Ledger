import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { getToken, parseJwt } from "../config/auth";

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
  hasAccount: boolean;
  setHasAccount: (status: boolean) => void;
  userAccount: string;
  setUserAccount: (acc: string) => void;
  balances: Record<string, number>;
  setBalances: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  transactions: Transaction[];
  addTransaction: (tx: Transaction) => void;
  executeTransfer: (
    toAcc: string,
    amt: number,
    cur: string,
    rate: number,
    debit: number,
    credit: number,
    title: string,
    category: "PERSONAL" | "BUSINESS",
  ) => void;
  chargeKrw: (amount: number) => void;
  resetAccount: () => void;
  getWalletDataById: (id: string) => { balances: Record<string, number>; userAccount: string } | null;
  setBusinessNumber: (bNo: string) => void;
  // 기업용
  corpAccount: string;
  setCorpAccount: (acc: string) => void;
  corpBalances: Record<string, number>;
  setCorpBalances: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  corpTransactions: Transaction[];
  setCorpTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

export const SUPPORTED_CURRENCIES = [
  "KRW",
  "AED",
  "AUD",
  "BHD",
  "BND",
  "CAD",
  "CHF",
  "CNH",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "IDR",
  "JPY",
  "KWD",
  "MYR",
  "NOK",
  "NZD",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "USD",
];

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string>("guest");
  const [businessNumber, setBusinessNumber] = useState<string>("");
  const [hasAccount, setHasAccount] = useState(false);
  const [userAccount, setUserAccount] = useState("");
  const initialBalances = SUPPORTED_CURRENCIES.reduce(
    (acc, cur) => ({ ...acc, [cur]: 0 }),
    {} as Record<string, number>,
  );
  const [balances, setBalances] =
    useState<Record<string, number>>(initialBalances);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // 기업용 데이터 (공유)
  const [corpAccount, setCorpAccount] = useState("");
  const [corpBalances, setCorpBalances] = useState<Record<string, number>>(initialBalances);
  const [corpTransactions, setCorpTransactions] = useState<Transaction[]>([]);

  const sanitizeNumber = (val: any): number => {
    const num =
      typeof val === "number"
        ? val
        : parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(num) || num < 0 ? 0 : num;
  };

  const loadUserData = (id: string, bNo?: string) => {
    if (!id || id === "guest") return;
    
    // 1. 개인 데이터 로드
    const savedData = localStorage.getItem(`wallet_data_${id}`);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setHasAccount(parsed.hasAccount || false);
      setUserAccount(parsed.userAccount || "");
      const sanitizedBalances: Record<string, number> = {};
      SUPPORTED_CURRENCIES.forEach((cur) => {
        sanitizedBalances[cur] = sanitizeNumber(parsed.balances?.[cur] || 0);
      });
      setBalances(sanitizedBalances);
      setTransactions(parsed.transactions || []);
    } else {
      // 데이터가 없으면 초기화 (개인용)
      setHasAccount(false);
      setUserAccount("");
      setBalances(initialBalances);
      setTransactions([]);
    }

    // 2. 기업 공금 데이터 로드 (사업자 번호가 있는 경우)
    if (bNo) {
      const savedCorpData = localStorage.getItem(`wallet_data_${bNo}`);
      if (savedCorpData) {
        const parsed = JSON.parse(savedCorpData);
        setCorpAccount(parsed.userAccount || "");
        const sanitizedBalances: Record<string, number> = {};
        SUPPORTED_CURRENCIES.forEach((cur) => {
          sanitizedBalances[cur] = sanitizeNumber(parsed.balances?.[cur] || 0);
        });
        setCorpBalances(sanitizedBalances);
        setCorpTransactions(parsed.transactions || []);
      } else {
        // 데이터가 없으면 규칙에 따라 생성 (더미 데이터 세션용)
        const newCorpAcc = `EX-2003-${Math.floor(1000 + Math.random() * 9000)}`;
        setCorpAccount(newCorpAcc);
        setCorpBalances(initialBalances);
        setCorpTransactions([]);
        
        // 로컬 스토리지에 초기 데이터 저장 (다음 로드 시를 위해)
        localStorage.setItem(`wallet_data_${bNo}`, JSON.stringify({
            hasAccount: true,
            userAccount: newCorpAcc,
            balances: initialBalances,
            transactions: []
        }));
      }
    }
  };

  useEffect(() => {
    const syncAuth = () => {
      const token = getToken();
      if (token) {
        try {
          const decoded = parseJwt(token);
          const currentId = decoded?.sub || decoded?.email || "guest";
          
          if (userId !== currentId) {
            setUserId(currentId);
            // businessNumber는 외부에서 명시적으로 set할 때까지 기다림 (JWT에는 없을 가능성이 큼)
            loadUserData(currentId, businessNumber);
          }
        } catch (e) {
          console.error("Auth sync error");
        }
      }
    };
    syncAuth();
    const interval = setInterval(syncAuth, 2000);
    return () => clearInterval(interval);
  }, [userId, businessNumber]);

  // businessNumber가 변경될 때마다 데이터 로드
  useEffect(() => {
    if (userId && userId !== "guest") {
      loadUserData(userId, businessNumber);
    }
  }, [businessNumber]);

  // 개인 데이터 저장
  useEffect(() => {
    if (userId !== "guest" && userAccount !== "") {
      localStorage.setItem(
        `wallet_data_${userId}`,
        JSON.stringify({ hasAccount, userAccount, balances, transactions }),
      );
    }
  }, [hasAccount, userAccount, balances, transactions, userId]);

  // 기업 공금 데이터 저장
  useEffect(() => {
    if (businessNumber && corpAccount !== "") {
      localStorage.setItem(
        `wallet_data_${businessNumber}`,
        JSON.stringify({ hasAccount: true, userAccount: corpAccount, balances: corpBalances, transactions: corpTransactions }),
      );
    }
  }, [businessNumber, corpAccount, corpBalances, corpTransactions]);

  const chargeKrw = (amount: number) => {
    const cleanAmount = sanitizeNumber(amount);
    if (cleanAmount <= 0) return;
    setBalances((prev) => ({
      ...prev,
      KRW: sanitizeNumber(prev.KRW) + cleanAmount,
    }));
    setTransactions((prev) => [
      {
        id: `CHG-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        type: "CHARGE",
        category: "PERSONAL",
        title: "포트원 결제 충전",
        amount: cleanAmount,
        currency: "KRW",
        rate: 1,
        finalKrw: cleanAmount,
        status: "COMPLETED",
      },
      ...prev,
    ]);
  };

  // 🌟 송금 로직: 상대방 계좌 존재 여부 체크 포함
  const executeTransfer = (
    toAccount: string,
    amount: number,
    currency: string,
    rate: number,
    debitAmount: number,
    creditAmount: number,
    title: string,
    category: "PERSONAL" | "BUSINESS",
  ) => {
    if (toAccount === userAccount) {
      throw new Error("본인 계좌로는 송금할 수 없습니다.");
    }

    const cleanDebit = sanitizeNumber(debitAmount);
    const cleanCredit = sanitizeNumber(creditAmount);

    if (balances.KRW < cleanDebit) {
      throw new Error("잔액이 부족합니다.");
    }

    // 🔍 [DB 시뮬레이션] 모든 유저 데이터를 검색하여 수취인 계좌 확인
    let targetUserKey = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("wallet_data_")) {
        const rawData = localStorage.getItem(key);
        if (rawData) {
          const otherData = JSON.parse(rawData);
          if (otherData.userAccount === toAccount) {
            targetUserKey = key;
            break;
          }
        }
      }
    }

    // ❌ 상대방 계좌가 DB(localStorage)에 없으면 에러 발생
    if (!targetUserKey) {
      throw new Error("존재하지 않는 계좌번호입니다. 다시 확인해 주세요.");
    }

    // ✅ 내 잔액 차감 및 내역 저장
    setBalances((prev) => ({
      ...prev,
      KRW: sanitizeNumber(prev.KRW) - cleanDebit,
    }));
    setTransactions((prev) => [
      {
        id: `TX-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        type: "TRANSFER",
        category,
        title: `${title}`,
        amount: -amount,
        currency,
        rate,
        finalKrw: cleanDebit,
        status: "COMPLETED",
      },
      ...prev,
    ]);

    // ✅ 상대방 잔액 증액 및 입금 내역 저장
    const rawTargetData = localStorage.getItem(targetUserKey);
    if (rawTargetData) {
      const targetData = JSON.parse(rawTargetData);
      targetData.balances.KRW =
        sanitizeNumber(targetData.balances.KRW) + cleanCredit;
      const inTx = {
        id: `IN-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        type: "INCOMING",
        category,
        title: `입금 확인 (${userAccount})`,
        amount: amount,
        currency,
        rate,
        finalKrw: cleanCredit,
        status: "COMPLETED",
      };
      targetData.transactions = [inTx, ...(targetData.transactions || [])];
      localStorage.setItem(targetUserKey, JSON.stringify(targetData));
    }
  };

  const resetAccount = () => {
    if (userId !== "guest") {
      localStorage.removeItem(`wallet_data_${userId}`);
      window.location.reload();
    }
  };

  const getWalletDataById = (id: string) => {
    if (!id || id === "guest") return null;
    const data = localStorage.getItem(`wallet_data_${id}`);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      // 계좌 번호가 없으면 규칙에 따라 생성 (더미 데이터용)
      let currentAcc = parsed.userAccount;
      if (!currentAcc || currentAcc === "미발급") {
          // id가 숫자로만 구성되어 있으면(사업자번호) 기업용(2003), 아니면 개인용(1004)
          const isCorp = /^\d+$/.test(id.replace(/-/g, ''));
          const prefix = isCorp ? "2003" : "1004";
          currentAcc = `EX-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      return {
        balances: parsed.balances || initialBalances,
        userAccount: currentAcc,
      };
    } catch (e) {
      return null;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        hasAccount,
        setHasAccount,
        userAccount,
        setUserAccount,
        balances,
        setBalances,
        transactions,
        executeTransfer,
        chargeKrw,
        resetAccount,
        getWalletDataById,
        setBusinessNumber,
        corpAccount,
        setCorpAccount,
        corpBalances,
        setCorpBalances,
        corpTransactions,
        setCorpTransactions,
        addTransaction: (tx) => setTransactions((prev) => [tx, ...prev]),
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
