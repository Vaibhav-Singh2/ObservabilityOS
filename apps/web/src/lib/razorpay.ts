import Razorpay from "razorpay";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_mock";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "mock_secret";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn(
    "[ObservabilityOS Razorpay] Warning: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured in environment variables. Razorpay features will run in mock mode."
  );
}

export const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

export default razorpay;
