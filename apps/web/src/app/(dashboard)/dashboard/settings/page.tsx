'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { featuresApi, settingsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  Settings,
  Zap,
  Loader2,
  Building2,
  Users,
  CreditCard,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const CATEGORY_LABELS: Record<string, string> = {
  INTEGRATION: 'Integracoes',
  AI: 'Inteligencia Artificial',
  PORTAL: 'Portais',
  AUTOMATION: 'Automacao',
  PAYMENT: 'Pagamentos',
};

const CATEGORY_ICONS: Record<string, any> = {
  INTEGRATION: Zap,
  AI: Settings,
  PORTAL: Building2,
  AUTOMATION: Settings,
  PAYMENT: CreditCard,
};

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'features' | 'company' | 'team' | 'billing'>('features');

  const { data: featuresData, isLoading: featuresLoading } = useQuery({
    queryKey: ['features'],
    queryFn: featuresApi.list,
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['features-status'],
    queryFn: featuresApi.status,
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team'],
    queryFn: settingsApi.getTeam,
    enabled: activeTab === 'team',
  });

  const { data: billingData, isLoading: billingLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: settingsApi.getBilling,
    enabled: activeTab === 'billing',
  });

  const enableMutation = useMutation({
    mutationFn: (featureId: string) => featuresApi.enable(featureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['features-status'] });
      toast({ title: 'Feature ativada com sucesso' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Erro ao ativar feature' });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (featureId: string) => featuresApi.disable(featureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['features-status'] });
      toast({ title: 'Feature desativada com sucesso' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Erro ao desativar feature' });
    },
  });

  const features = featuresData?.data?.features || [];
  const groupedFeatures = featuresData?.data?.grouped || {};
  const status = statusData?.data;
  const settings = settingsData?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-muted-foreground">
          Gerencie as configuracoes da sua imobiliaria
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b">
        {[
          { id: 'features', label: 'Features', icon: Zap },
          { id: 'company', label: 'Empresa', icon: Building2 },
          { id: 'team', label: 'Equipe', icon: Users },
          { id: 'billing', label: 'Faturamento', icon: CreditCard },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo das Features</CardTitle>
              <CardDescription>
                Controle quais funcionalidades estao ativas na sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-primary">
                    {status?.enabledFeatures || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Features ativas</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-primary">
                    {status?.totalFeatures || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Features disponiveis</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(status?.totalMonthlyCost || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Custo mensal adicional</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features by Category */}
          {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => {
            const CategoryIcon = CATEGORY_ICONS[category] || Settings;
            return (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className="h-5 w-5 text-primary" />
                    <CardTitle>{CATEGORY_LABELS[category] || category}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(categoryFeatures as any[]).map((feature: any) => (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{feature.name}</h3>
                            {Number(feature.monthlyPrice) > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {formatCurrency(Number(feature.monthlyPrice))}/mes
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                          {feature.isEnabled && feature.usageCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Uso: {feature.usageCount}
                              {feature.usageLimit && ` / ${feature.usageLimit}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <Switch
                            checked={feature.isEnabled}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                enableMutation.mutate(feature.id);
                              } else {
                                disableMutation.mutate(feature.id);
                              }
                            }}
                            disabled={enableMutation.isPending || disableMutation.isPending}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Company Tab */}
      {activeTab === 'company' && (
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>
              Informacoes da sua imobiliaria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome</label>
                  <Input defaultValue={settings?.company?.name} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CNPJ</label>
                  <Input defaultValue={settings?.company?.cnpj} disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CRECI</label>
                  <Input defaultValue={settings?.company?.creci} disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input defaultValue={settings?.company?.email} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input defaultValue={settings?.company?.phone} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input defaultValue={settings?.company?.website} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Endereco</label>
                  <Input defaultValue={settings?.company?.address} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cidade</label>
                  <Input defaultValue={settings?.company?.city} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Input defaultValue={settings?.company?.state} />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button>Salvar alteracoes</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Equipe</CardTitle>
              <CardDescription>
                Gerencie os usuarios da sua imobiliaria
              </CardDescription>
            </div>
            <Button>Convidar usuario</Button>
          </CardHeader>
          <CardContent>
            {teamLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {teamData?.data?.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {user.role}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>
                Informacoes do seu plano de assinatura
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {billingData?.data?.plan?.name || 'Plano Basico'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {billingData?.data?.plan?.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {formatCurrency(billingData?.data?.totalMonthly || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">/mes</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Plano base</p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(billingData?.data?.planPrice || 0)}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Features adicionais</p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(billingData?.data?.featuresPrice || 0)}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total mensal</p>
                      <p className="text-xl font-semibold text-primary">
                        {formatCurrency(billingData?.data?.totalMonthly || 0)}
                      </p>
                    </div>
                  </div>

                  {billingData?.data?.enabledFeatures?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Features ativas:</h4>
                      <div className="flex flex-wrap gap-2">
                        {billingData.data.enabledFeatures.map((f: any) => (
                          <span
                            key={f.name}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {f.name}: {formatCurrency(Number(f.price))}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
