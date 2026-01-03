import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { VerifyEmailAPI } from "../API/userServices";
import { InputField } from "../ui/InputUI";
import { ButtonUI } from "../ui/ButtonUI";
import { useNavigate } from "react-router-dom";

const validationSchema = Yup.object({
  email: Yup.string().email().required("Email Field is required"),
  verificationCode: Yup.string()
    .required("Password Field is required")
    .min(6, "OTP should not be less than 6")
    .max(6, "OTP should not be more than 6"),
});

function VerifyEmail() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useMutation({
    mutationKey: ["Login"],
    mutationFn: VerifyEmailAPI,
  });
  const formik = useFormik({
    initialValues: {
      email: "",
      verificationCode: "",
    },
    validationSchema,
    onSubmit: (values) => {
      console.log(values);
      mutateAsync(values)
        .then((data) => {
          console.log(data);
          navigate("/Login");
          formik.resetForm();
        })
        .catch((err: unknown) => console.log(err));
    },
  });
  return (
    <div className="flex justify-center items-center h-screen w-full bg-gray-100">
      <div className="w-full md:w-1/2 h-screen flex items-center pt-[10vh] gap-3 flex-col px-4 lg:px-[100px]">
        <p className="text-blue-950 text-center text-3xl font-bold">
          Verify Your Email
        </p>
        <p className="text-gray-400 text-center text-sm">
          We've sent a verification link to your email. Please check your inbox
          to continue.
        </p>

        <form
          onSubmit={formik.handleSubmit}
          className="w-full flex flex-col gap-3 pt-5 pb-2"
        >
          <InputField
            isPending={isPending}
            formik={formik}
            name="email"
            label="Email"
            type="email"
            size="medium"
          />

          <InputField
            isPending={isPending}
            formik={formik}
            name="verificationCode"
            label="OTP"
            type="text"
            size="medium"
          />
          <ButtonUI isPending={isPending} name="Submit" />
        </form>
      </div>
    </div>
  );
}

export default VerifyEmail;
