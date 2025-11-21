"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/providers/auth-provider";
import {
  createChild,
  createGrowthLog,
  createMedicationLog,
  createVaccineRecord,
  downloadMedicationLogsPdf,
  downloadVaccineRecordsPdf,
  getChildren,
  getGrowthLogs,
  getMedicationLogs,
  getVaccineRecords,
  updateGrowthLog,
  updateMedicationLog,
  updateVaccineRecord,
} from "@/lib/api";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { AddChildDialog, type ChildFormValues } from "@/components/dashboard/add-child-dialog";
import { AddGrowthLogDialog, type GrowthFormValues } from "@/components/dashboard/add-growth-log-dialog";
import { AddMedicationLogDialog, type MedicationFormValues } from "@/components/dashboard/add-medication-log-dialog";
import { AddVaccineRecordDialog, type VaccineFormValues } from "@/components/dashboard/add-vaccine-record-dialog";
import { GrowthChart } from "@/components/GrowthChart";
import { Baby, Clock, Download, Pill, Plus, Ruler, Scale, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  GrowthLogRead,
  MedicationLogRead,
  MedicationLogUpdate,
  UserRead,
  VaccineRecordRead,
  VaccineRecordUpdate,
} from "@/lib/types";

const toDateTimeInputValue = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 16);
  }
  return parsed.toISOString().slice(0, 16);
};

const makeSafeFileName = (value?: string | null) => {
  if (!value) return "medication";
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "medication";
};

const normalizeDateInput = (value?: string | null) => {
  return value && value.trim().length > 0 ? value : null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGrowthDialogOpen, setIsGrowthDialogOpen] = useState(false);
  const [isMedicationDialogOpen, setIsMedicationDialogOpen] = useState(false);
  const [isVaccineDialogOpen, setIsVaccineDialogOpen] = useState(false);
  const [editingGrowthLog, setEditingGrowthLog] = useState<GrowthLogRead | null>(null);
  const [editingMedicationLog, setEditingMedicationLog] = useState<MedicationLogRead | null>(null);
  const [editingVaccineRecord, setEditingVaccineRecord] = useState<VaccineRecordRead | null>(null);

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
    }
  }, [loading, router, token]);

  const { data: children = [], isLoading: isChildrenLoading } = useQuery({
    queryKey: ["children"],
    queryFn: getChildren,
    enabled: Boolean(token),
  });

  const selectedChildId = activeChildId ?? children[0]?.id ?? null;

  const growthQuery = useQuery({
    queryKey: ["growth", selectedChildId],
    queryFn: () => getGrowthLogs(selectedChildId ?? undefined),
    enabled: Boolean(token && selectedChildId),
  });

  const medicationQuery = useQuery({
    queryKey: ["medications", selectedChildId],
    queryFn: () => getMedicationLogs(selectedChildId ?? undefined),
    enabled: Boolean(token && selectedChildId),
  });

  const vaccineQuery = useQuery({
    queryKey: ["vaccines", selectedChildId],
    queryFn: () => getVaccineRecords(selectedChildId ?? undefined),
    enabled: Boolean(token && selectedChildId),
  });

  const createChildMutation = useMutation({
    mutationFn: createChild,
    onSuccess: async (createdChild) => {
      toast.success(`${createdChild.name} added`);
      setIsDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["children"] });
      setActiveChildId(createdChild.id);
    },
    onError: (error: Error) => toast.error(error.message ?? "Unable to save child"),
  });

  const createGrowthMutation = useMutation({
    mutationFn: createGrowthLog,
    onSuccess: async () => {
      toast.success("Growth log added");
      setIsGrowthDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["growth", selectedChildId] });
    },
    onError: (error: Error) => toast.error(error.message ?? "Unable to save growth log"),
  });

  const updateGrowthMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: GrowthFormValues;
      childId: string;
    }) => updateGrowthLog(id, payload),
    onSuccess: async (_, variables) => {
      toast.success("Growth log updated");
      setIsGrowthDialogOpen(false);
      setEditingGrowthLog(null);
      await queryClient.invalidateQueries({ queryKey: ["growth", variables.childId] });
    },
    onError: (error: Error) => toast.error(error.message ?? "Unable to update growth log"),
  });

  const createMedicationMutation = useMutation({
    mutationFn: createMedicationLog,
    onSuccess: async () => {
      toast.success("Medication log added");
      setIsMedicationDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["medications", selectedChildId] });
    },
    onError: (error: Error) => toast.error(error.message ?? "Unable to save medication log"),
  });

  const updateMedicationMutation = useMutation({
    mutationFn: (variables: {
      id: string;
      payload: MedicationLogUpdate;
      childId: string;
    }) => updateMedicationLog(variables.id, variables.payload),
    onSuccess: async (_, variables) => {
      toast.success("Medication log updated");
      setIsMedicationDialogOpen(false);
      setEditingMedicationLog(null);
      await queryClient.invalidateQueries({ queryKey: ["medications", variables.childId] });
    },
    onError: (error: Error) => toast.error(error.message ?? "Unable to update medication log"),
  });

  const createVaccineMutation = useMutation({
    mutationFn: createVaccineRecord,
    onSuccess: async () => {
      toast.success("Vaccine record saved");
      setIsVaccineDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["vaccines", selectedChildId] });
    },
    onError: (error: Error) => toast.error(error.message ?? "Unable to save vaccine record"),
  });

  const updateVaccineMutation = useMutation({
    mutationFn: (variables: {
      id: string;
      payload: VaccineRecordUpdate;
      childId: string;
    }) => updateVaccineRecord(variables.id, variables.payload),
    onSuccess: async (_, variables) => {
      toast.success("Vaccine record updated");
      setIsVaccineDialogOpen(false);
      setEditingVaccineRecord(null);
      await queryClient.invalidateQueries({ queryKey: ["vaccines", variables.childId] });
    },
    onError: (error: Error) => toast.error(error.message ?? "Unable to update vaccine record"),
  });

  const downloadMedicationPdfMutation = useMutation({
    mutationFn: (childId: string) => downloadMedicationLogsPdf(childId),
  });

  const downloadVaccinePdfMutation = useMutation({
    mutationFn: (childId: string) => downloadVaccineRecordsPdf(childId),
  });

  const handleCreateChild = async (values: ChildFormValues) => {
    if (!user?.id) {
      toast.error("Missing parent id");
      return;
    }

    try {
      await createChildMutation.mutateAsync({
        ...values,
        blood_type: values.blood_type?.trim() || null,
        parent_id: user.id,
      });
    } catch {
      // handled by mutation onError
    }
  };

  const handleSaveGrowth = async (values: GrowthFormValues) => {
    if (editingGrowthLog) {
      try {
        await updateGrowthMutation.mutateAsync({
          id: editingGrowthLog.id,
          childId: editingGrowthLog.child_id,
          payload: values,
        });
      } catch {
        // handled by mutation
      }
      return;
    }

    if (!selectedChildId) {
      toast.error("Select a child first");
      return;
    }

    try {
      await createGrowthMutation.mutateAsync({
        ...values,
        child_id: selectedChildId,
      });
    } catch {
      // handled by mutation onError
    }
  };

  const handleSaveMedication = async (values: MedicationFormValues) => {
    const formattedPayload: MedicationLogUpdate = {
      medicine_name: values.medicine_name,
      dosage: values.dosage?.trim() ? values.dosage.trim() : null,
      administered_at: values.administered_at,
    };

    if (editingMedicationLog) {
      try {
        await updateMedicationMutation.mutateAsync({
          id: editingMedicationLog.id,
          childId: editingMedicationLog.child_id,
          payload: formattedPayload,
        });
      } catch {
        // handled by mutation
      }
      return;
    }

    if (!selectedChildId) {
      toast.error("Select a child first");
      return;
    }
    try {
      await createMedicationMutation.mutateAsync({
        ...formattedPayload,
        child_id: selectedChildId,
      });
    } catch {
      // handled by mutation
    }
  };

  const handleSaveVaccine = async (values: VaccineFormValues) => {
    const normalizedAdminDate = normalizeDateInput(values.administered_date);
    const payloadWithAdminDate = {
      ...values,
      administered_date: normalizedAdminDate,
    };

    if (editingVaccineRecord) {
      try {
        await updateVaccineMutation.mutateAsync({
          id: editingVaccineRecord.id,
          childId: editingVaccineRecord.child_id,
          payload: payloadWithAdminDate,
        });
      } catch {
        // handled by mutation
      }
      return;
    }

    if (!selectedChildId) {
      toast.error("Select a child first");
      return;
    }
    try {
      await createVaccineMutation.mutateAsync({
        ...payloadWithAdminDate,
        child_id: selectedChildId,
      });
    } catch {
      // handled by mutation
    }
  };

  const handleDownloadMedicationPdf = async () => {
    if (!selectedChildId) {
      toast.error("Select a child first");
      return;
    }

    try {
      const blob = await downloadMedicationPdfMutation.mutateAsync(selectedChildId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `${makeSafeFileName(activeChild?.name)}_medication_logs.pdf`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Medication log PDF downloaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to download medication logs";
      toast.error(message);
    }
  };

  const handleDownloadVaccinePdf = async () => {
    if (!selectedChildId) {
      toast.error("Select a child first");
      return;
    }
    try {
      const blob = await downloadVaccinePdfMutation.mutateAsync(selectedChildId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `${makeSafeFileName(activeChild?.name)}_vaccine_schedule.pdf`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Vaccine schedule PDF downloaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to download vaccine schedule";
      toast.error(message);
    }
  };

  const handleGrowthDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingGrowthLog(null);
    }
    setIsGrowthDialogOpen(open);
  };

  const handleMedicationDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingMedicationLog(null);
    }
    setIsMedicationDialogOpen(open);
  };

  const handleVaccineDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingVaccineRecord(null);
    }
    setIsVaccineDialogOpen(open);
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const activeChild = children.find((child) => child.id === selectedChildId) ?? null;

  const growthLogs = growthQuery.data ?? [];
  const medicationLogs = medicationQuery.data ?? [];
  const vaccineRecords = vaccineQuery.data ?? [];

  const orderedGrowthLogs = growthLogs
    .slice()
    .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  const orderedMedicationLogs = medicationLogs
    .slice()
    .sort((a, b) => new Date(b.administered_at).getTime() - new Date(a.administered_at).getTime());
  const orderedVaccineRecords = vaccineRecords
    .slice()
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());

  const shouldForceDialog = !isChildrenLoading && children.length === 0;
  const dialogOpen = shouldForceDialog || isDialogOpen;

  const latestLog = orderedGrowthLogs[0];

  const heroStats: { label: string; value: string; icon: LucideIcon; meta?: string }[] = [
    {
      label: "Children",
      value: children.length > 0 ? `${children.length}` : "None",
      meta: children.length === 1 ? "profile" : "profiles",
      icon: Baby,
    },
    {
      label: "Active child",
      value: activeChild ? activeChild.name : "Not selected",
      meta: activeChild ? `DOB ${formatDate(activeChild.dob)}` : "Add a child to get started",
      icon: Ruler,
    },
    {
      label: "Last growth log",
      value: latestLog ? formatDate(latestLog.record_date) : "Not logged yet",
      meta: latestLog ? `${latestLog.weight_kg.toFixed(1)} kg` : "Record the first measurements",
      icon: Clock,
    },
  ];

  const growthDialogInitialValues = useMemo(() => {
    if (!editingGrowthLog) {
      return null;
    }
    return {
      record_date: editingGrowthLog.record_date,
      weight_kg: editingGrowthLog.weight_kg,
      height_cm: editingGrowthLog.height_cm,
    };
  }, [editingGrowthLog]);

  const medicationDialogInitialValues = useMemo(() => {
    if (!editingMedicationLog) {
      return null;
    }
    return {
      medicine_name: editingMedicationLog.medicine_name,
      dosage: editingMedicationLog.dosage ?? "",
      administered_at: toDateTimeInputValue(editingMedicationLog.administered_at),
    };
  }, [editingMedicationLog]);

  const vaccineDialogInitialValues = useMemo(() => {
    if (!editingVaccineRecord) {
      return null;
    }
    return {
      vaccine_name: editingVaccineRecord.vaccine_name,
      scheduled_date: editingVaccineRecord.scheduled_date,
      status: editingVaccineRecord.status,
      administered_date: editingVaccineRecord.administered_date ?? "",
    };
  }, [editingVaccineRecord]);

  return (
    <div className="container mx-auto space-y-8 px-4 py-10">
      <section className="rounded-2xl border bg-gradient-to-br from-blue-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-blue-700/80">Dashboard</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Hello {user?.full_name ? user.full_name.split(" ")[0] : user?.email},
            </h1>
            <p className="text-muted-foreground">
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)} variant="default">
              <Plus className="h-4 w-4" />
              Add Child
            </Button>
            <Button
              className="gap-2"
              variant="secondary"
              onClick={() => handleGrowthDialogOpenChange(true)}
              disabled={!selectedChildId}
            >
              <Ruler className="h-4 w-4" />
              Log Growth
            </Button>
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
        <div className="mt-6 grid w-full max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {heroStats.map((stat) => (
            <div key={stat.label} className="max-w-xs rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold text-slate-900">{stat.value}</p>
                  {stat.meta && <p className="text-xs text-muted-foreground">{stat.meta}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isChildrenLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading your children…</CardTitle>
            <CardDescription>Please wait while we fetch your data.</CardDescription>
          </CardHeader>
        </Card>
      ) : children.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No children yet</CardTitle>
            <CardDescription>Add your newborn to begin logging growth and health events.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsDialogOpen(true)}>Add Child</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Your children</CardTitle>
            <CardDescription>Switch between profiles to view insights.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedChildId ?? undefined} onValueChange={setActiveChildId}>
              <TabsList className="mb-4 w-full flex-wrap justify-start gap-2 rounded-full border bg-muted/70 p-1.5">
                {children.map((child) => (
                  <TabsTrigger
                    key={child.id}
                    value={child.id}
                    className="capitalize data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    {child.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {children.map((child) => (
                <TabsContent key={child.id} value={child.id}>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Profile overview</p>
                          <p className="text-xl font-semibold">{child.name}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Date of birth</p>
                          <p className="font-medium">{formatDate(child.dob)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gender</p>
                          <p className="font-medium">{child.gender}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Blood Type</p>
                          <p className="font-medium">{child.blood_type ?? "--"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">{formatDateTime(child.created_at)}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">Growth trends</h3>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <GrowthChart
                            data={child.id === selectedChildId ? growthLogs : []}
                            loading={growthQuery.isLoading && child.id === selectedChildId}
                            metric="weight"
                            childDob={child.dob}
                            title="Weight trajectory"
                          />
                          <GrowthChart
                            data={child.id === selectedChildId ? growthLogs : []}
                            loading={growthQuery.isLoading && child.id === selectedChildId}
                            metric="height"
                            childDob={child.dob}
                            title="Height trajectory"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold">Recent growth logs</h3>
                          <p className="text-sm text-muted-foreground">Capture weight and height changes over time.</p>
                        </div>
                        {child.id === selectedChildId && (
                          <Button size="sm" variant="secondary" className="gap-2" onClick={() => handleGrowthDialogOpenChange(true)}>
                            <Scale className="h-4 w-4" />
                            Log Growth
                          </Button>
                        )}
                      </div>
                      {child.id === selectedChildId && orderedGrowthLogs.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Weight (kg)</TableHead>
                                <TableHead>Height (cm)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orderedGrowthLogs.map((log) => (
                                <TableRow key={log.id}>
                                  <TableCell>{formatDate(log.record_date)}</TableCell>
                                  <TableCell>{log.weight_kg.toFixed(2)}</TableCell>
                                  <TableCell>{log.height_cm.toFixed(1)}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingGrowthLog(log);
                                        handleGrowthDialogOpenChange(true);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 p-8 text-center">
                          <Scale className="mb-3 h-8 w-8 text-muted-foreground" />
                          <p className="text-base font-semibold">No growth logs yet</p>
                          <p className="mb-4 text-sm text-muted-foreground">Record the first measurements to visualize progress.</p>
                          {child.id === selectedChildId && (
                            <Button size="sm" className="gap-2" onClick={() => handleGrowthDialogOpenChange(true)}>
                              <Plus className="h-4 w-4" />
                              Add log
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <Card className="rounded-2xl border bg-white shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base font-semibold">Medication log</CardTitle>
                          <CardDescription>Track administered medicines and dosages.</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-2"
                            onClick={() => {
                              setActiveChildId(child.id);
                              handleMedicationDialogOpenChange(true);
                            }}
                          >
                            <Pill className="h-4 w-4" />
                            Log dose
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={handleDownloadMedicationPdf}
                            disabled={!selectedChildId || downloadMedicationPdfMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                            {downloadMedicationPdfMutation.isPending ? "Preparing..." : "Download PDF"}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {child.id === selectedChildId && orderedMedicationLogs.length > 0 ? (
                          <div className="overflow-hidden rounded-xl border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Medicine</TableHead>
                                  <TableHead>Dosage</TableHead>
                                  <TableHead>Administered</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orderedMedicationLogs.slice(0, 5).map((log) => (
                                  <TableRow key={log.id}>
                                    <TableCell className="font-medium">{log.medicine_name}</TableCell>
                                    <TableCell>{log.dosage ?? "--"}</TableCell>
                                    <TableCell>{formatDateTime(log.administered_at)}</TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingMedicationLog(log);
                                          handleMedicationDialogOpenChange(true);
                                        }}
                                      >
                                        Edit
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                            <Pill className="mb-2 h-6 w-6 text-muted-foreground" />
                            No medication logs yet.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border bg-white shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-semibold">Vaccine schedule</CardTitle>
                          <CardDescription>Monitor upcoming and completed vaccines.</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-2"
                            onClick={() => {
                              setActiveChildId(child.id);
                              handleVaccineDialogOpenChange(true);
                            }}
                          >
                            <Shield className="h-4 w-4" />
                            Add vaccine
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={handleDownloadVaccinePdf}
                            disabled={!selectedChildId || downloadVaccinePdfMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                            {downloadVaccinePdfMutation.isPending ? "Preparing..." : "Download PDF"}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {child.id === selectedChildId && orderedVaccineRecords.length > 0 ? (
                          <div className="overflow-hidden rounded-xl border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Vaccine</TableHead>
                                  <TableHead>Scheduled</TableHead>
                                  <TableHead>Administered</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orderedVaccineRecords.map((record) => (
                                  <TableRow key={record.id}>
                                    <TableCell>
                                      <div className="flex flex-col gap-1">
                                        <span className="font-medium">{record.vaccine_name}</span>
                                        {record.is_recommended ? (
                                          <Badge
                                            variant="outline"
                                            className="w-fit border-blue-200 text-xs font-semibold text-blue-700"
                                          >
                                            WHO recommended
                                          </Badge>
                                        ) : null}
                                      </div>
                                    </TableCell>
                                    <TableCell>{formatDate(record.scheduled_date)}</TableCell>
                                    <TableCell>
                                      {record.administered_date ? formatDate(record.administered_date) : "—"}
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className={cn(
                                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                          record.status === "COMPLETED"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700",
                                        )}
                                      >
                                        {record.status === "COMPLETED" ? "Completed" : "Pending"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingVaccineRecord(record);
                                          handleVaccineDialogOpenChange(true);
                                        }}
                                      >
                                        Edit
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                            <Shield className="mb-2 h-6 w-6 text-muted-foreground" />
                            No vaccine records yet.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      <AddChildDialog
        open={dialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleCreateChild}
        isSubmitting={createChildMutation.isPending}
      />
      <AddGrowthLogDialog
        open={isGrowthDialogOpen}
        onOpenChange={handleGrowthDialogOpenChange}
        onSubmit={handleSaveGrowth}
        isSubmitting={createGrowthMutation.isPending || updateGrowthMutation.isPending}
        childName={activeChild?.name}
        mode={editingGrowthLog ? "edit" : "create"}
        initialValues={growthDialogInitialValues}
      />
      <AddMedicationLogDialog
        open={isMedicationDialogOpen}
        onOpenChange={handleMedicationDialogOpenChange}
        onSubmit={handleSaveMedication}
        isSubmitting={createMedicationMutation.isPending || updateMedicationMutation.isPending}
        mode={editingMedicationLog ? "edit" : "create"}
        initialValues={medicationDialogInitialValues}
      />
      <AddVaccineRecordDialog
        open={isVaccineDialogOpen}
        onOpenChange={handleVaccineDialogOpenChange}
        onSubmit={handleSaveVaccine}
        isSubmitting={createVaccineMutation.isPending || updateVaccineMutation.isPending}
        mode={editingVaccineRecord ? "edit" : "create"}
        initialValues={vaccineDialogInitialValues}
      />
    </div>
  );
}

function UserMenu({ user, onLogout }: { user: UserRead | null; onLogout: () => void }) {
  const displayName = user?.full_name?.trim().length ? user.full_name : user?.email ?? "Guest caregiver";
  const email = user?.email ?? "No email available";
  const initials = (user?.full_name || user?.email || "N/A")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("") || "NC";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-full border border-border/80 bg-white px-2 py-1 shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <Avatar className="h-11 w-11">
            <AvatarImage src="https://github.com/shadc1Chn.png" alt={`${displayName} avatar`} />
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
