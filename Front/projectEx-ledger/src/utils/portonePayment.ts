import axios from "axios";

export const requestPortonePayment = async (data: {
  amount: number;
  orderName: string;
  buyerName: string;
  buyerEmail: string;
}) => {
  const PortOne = (window as any).PortOne;

  const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID;
  const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY;

  try {
    const response = await PortOne.requestPayment({
      storeId: STORE_ID,
      channelKey: CHANNEL_KEY,
      paymentId: `payment-${crypto.randomUUID()}`,
      orderName: data.orderName,
      totalAmount: data.amount,
      currency: "CURRENCY_KRW",
      payMethod: "CARD",
      customer: {
        fullName: data.buyerName,
        email: data.buyerEmail,
      },
    });

    if (response.code !== undefined) {
      throw new Error(response.message);
    }

    const verifyRes = await axios.post("/api/v1/payments/verify", {
      paymentId: response.paymentId,
    });

    return verifyRes.data;
  } catch (error: any) {
    throw error.message || "결제 중 오류가 발생했습니다.";
  }
};
