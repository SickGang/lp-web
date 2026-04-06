import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Login = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forbiddenMessage, setForbiddenMessage] = useState("");
  const { login } = useAuth();

  useEffect(() => {
    if (searchParams.get("reason") === "forbidden") {
      setForbiddenMessage(
        "Недостаточно прав. У пользователя должна быть роль OWNER или ADMIN в базе данных.",
      );
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(phone, password);
    } catch (err) {
      setError("Неверный номер телефона или пароль");
    }
  };

  return (
    <div className="min-h-screen bg-[#17181C] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#2C2C2E] border-[#3A3A3C]">
        <CardHeader>
          <CardTitle className="text-center text-white">LP Detailing</CardTitle>
          <p className="text-center text-sm text-[#CCCCCC]">
            Панель администратора
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Номер телефона
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 999-99-99"
                required
                className="bg-[#27292D] border-[#3A3A3C]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Пароль</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                className="bg-[#27292D] border-[#3A3A3C]"
              />
            </div>
            {forbiddenMessage && (
              <div
                className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200"
                role="alert"
              >
                {forbiddenMessage}
              </div>
            )}
            {error && (
              <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full">
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
