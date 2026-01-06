'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Building2,
  Users,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.stats,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: dashboardApi.activity,
  });

  const { data: chartsData, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: () => dashboardApi.charts(30),
  });

  const stats = statsData?.data;
  const activity = activityData?.data;
  const charts = chartsData?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visao geral da sua imobiliaria
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Imoveis</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.properties?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.properties?.available || 0} disponiveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.leads?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.leads?.new || 0} novos /{' '}
              {stats?.leads?.conversionRate || 0}% conversao
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Visitas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.visits?.scheduled || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.visits?.completedThisMonth || 0} realizadas este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.contracts?.active || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.contracts?.totalValue || 0)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads por Origem</CardTitle>
            <CardDescription>Distribuicao de leads por canal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : charts?.leadsBySource?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.leadsBySource}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ source, count }) => `${source}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="source"
                    >
                      {charts.leadsBySource.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sem dados disponiveis
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imoveis por Tipo</CardTitle>
            <CardDescription>Distribuicao do portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : charts?.propertiesByType?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.propertiesByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sem dados disponiveis
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Leads Recentes</CardTitle>
              <CardDescription>Ultimos leads cadastrados</CardDescription>
            </div>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded" />
                  ))}
                </div>
              ) : activity?.recentLeads?.length > 0 ? (
                activity.recentLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{lead.name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.property?.title || 'Interesse geral'}
                      </p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {lead.stage}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">
                  Nenhum lead recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Visitas</CardTitle>
              <CardDescription>Proximas visitas agendadas</CardDescription>
            </div>
            <Link href="/dashboard/visits">
              <Button variant="ghost" size="sm">
                Ver todas <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded" />
                  ))}
                </div>
              ) : activity?.recentVisits?.length > 0 ? (
                activity.recentVisits.map((visit: any) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{visit.property?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {visit.broker?.name}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        visit.status === 'DONE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {visit.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">
                  Nenhuma visita recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contratos</CardTitle>
              <CardDescription>Ultimos contratos</CardDescription>
            </div>
            <Link href="/dashboard/contracts">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded" />
                  ))}
                </div>
              ) : activity?.recentContracts?.length > 0 ? (
                activity.recentContracts.map((contract: any) => (
                  <div
                    key={contract.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{contract.property?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {contract.buyerTenant?.name}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        contract.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {formatCurrency(contract.value)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">
                  Nenhum contrato recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
