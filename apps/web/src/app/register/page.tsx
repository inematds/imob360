'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/api';
import { Building2, Loader2 } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no minimo 3 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres'),
  confirmPassword: z.string(),
  companyName: z.string().min(3, 'Nome da empresa deve ter no minimo 3 caracteres'),
  cnpj: z.string().min(14, 'CNPJ invalido').max(18, 'CNPJ invalido'),
  creci: z.string().min(3, 'CRECI invalido'),
  phone: z.string().min(10, 'Telefone invalido'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas nao coincidem',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        companyName: data.companyName,
        cnpj: data.cnpj,
        creci: data.creci,
        phone: data.phone,
      });
      toast({
        title: 'Cadastro realizado com sucesso!',
        description: 'Voce ja pode fazer login na plataforma',
      });
      router.push('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao realizar cadastro';
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados para cadastrar sua imobiliaria
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Seu Nome
                </label>
                <Input
                  id="name"
                  placeholder="Joao Silva"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="******"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Senha
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="******"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <hr className="my-4" />

            <div className="space-y-2">
              <label htmlFor="companyName" className="text-sm font-medium">
                Nome da Imobiliaria
              </label>
              <Input
                id="companyName"
                placeholder="Imobiliaria Exemplo Ltda"
                {...register('companyName')}
              />
              {errors.companyName && (
                <p className="text-sm text-red-500">{errors.companyName.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="cnpj" className="text-sm font-medium">
                  CNPJ
                </label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0001-00"
                  {...register('cnpj')}
                />
                {errors.cnpj && (
                  <p className="text-sm text-red-500">{errors.cnpj.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="creci" className="text-sm font-medium">
                  CRECI
                </label>
                <Input
                  id="creci"
                  placeholder="12345-J"
                  {...register('creci')}
                />
                {errors.creci && (
                  <p className="text-sm text-red-500">{errors.creci.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Telefone
              </label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Ja tem uma conta?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Faca login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
