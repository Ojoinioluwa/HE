import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { VerifyEmailAPI, ResendOTPAPI } from "../API/userServices";
import { InputField } from "../ui/InputUI";
import { ButtonUI } from "../ui/ButtonUI";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email is required"),
  verificationCode: Yup.string()
    .required("OTP is required")
    .length(6, "OTP must be exactly 6 characters"),
});

function VerifyEmail() {
  const navigate = useNavigate();
  const [timer, setTimer] = useState(6);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promptEmail, setPromptEmail] = useState("");

  // DERIVED STATE: No more setState(true) inside useEffect!
  const canResend = timer === 0;

  useEffect(() => {
    if (timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const { mutateAsync: resendOTP, isPending: resending } = useMutation({
    mutationKey: ["resendOTP"],
    mutationFn: ResendOTPAPI,
  });

  const handleResendAction = async (targetEmail: string) => {
    try {
      await resendOTP({ email: targetEmail });
      toast.success(`New code sent to ${targetEmail}`);
      setTimer(60);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend code.");
    }
  };

  const onResendClick = () => {
    if (formik.values.email) {
      handleResendAction(formik.values.email);
    } else {
      setIsModalOpen(true);
    }
  };

  const formik = useFormik({
    initialValues: { email: "", verificationCode: "" },
    validationSchema,
    onSubmit: async (values) => {
      try {
        await VerifyEmailAPI(values);
        toast.success("Email verified successfully!");
        navigate("/Login");
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Verification failed");
      }
    },
  });

  return (
    <div className="relative flex justify-center items-center min-h-screen w-full bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 border border-blue-50">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 text-white text-2xl shadow-lg">
            ✓
          </div>
          <h2 className="text-blue-950 text-3xl font-bold">Verify Account</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Enter the 6-digit code sent to your inbox. Please Check your Spam
            Folder
          </p>
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-5">
          <InputField
            isPending={false}
            formik={formik}
            name="email"
            label="Email Address"
            type="email"
            size="medium"
          />
          <InputField
            isPending={false}
            formik={formik}
            name="verificationCode"
            label="Verification Code"
            type="text"
            size="medium"
          />
          <div className="pt-2">
            <ButtonUI isPending={false} name="Verify Account" />
          </div>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-gray-500 text-sm">Didn't receive the code?</p>
          <button
            type="button"
            onClick={onResendClick}
            disabled={!canResend || resending}
            className={`mt-2 font-bold text-sm transition-all ${
              canResend
                ? "text-blue-600 hover:text-blue-800 underline"
                : "text-gray-400 cursor-not-allowed"
            }`}
          >
            {resending
              ? "Sending..."
              : canResend
                ? "Resend Code"
                : `Resend in ${timer}s`}
          </button>
        </div>
      </div>

      {/* --- EMAIL PROMPT POPUP (MODAL) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-in-center">
            <h3 className="text-xl font-bold text-blue-950 mb-2">
              Resend Code
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Please confirm the email address where we should send the new
              code.
            </p>
            <input
              type="email"
              placeholder="name@example.com"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              value={promptEmail}
              onChange={(e) => setPromptEmail(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!promptEmail) return toast.error("Email is required");
                  formik.setFieldValue("email", promptEmail);
                  handleResendAction(promptEmail);
                }}
                className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-md"
              >
                Send Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerifyEmail;
