import { verifyRole } from "@/lib/dal";
import {
  getServiceTypes,
  getProviders,
  getBlockedTimes,
  getAppointmentSettings,
} from "@/lib/actions/appointment-settings";
import { ServiceTypeList } from "@/components/appointments/settings/ServiceTypeList";
import { ProviderList } from "@/components/appointments/settings/ProviderList";
import { ProviderScheduleEditor } from "@/components/appointments/settings/ProviderScheduleEditor";
import { BlockedTimeManager } from "@/components/appointments/settings/BlockedTimeManager";
import { CancellationPolicyCard } from "@/components/appointments/settings/CancellationPolicyCard";
import { Settings } from "lucide-react";

export default async function AppointmentSettingsPage() {
  await verifyRole("ADMIN");

  const [serviceTypes, providers, blockedTimes, settings] = await Promise.all([
    getServiceTypes(),
    getProviders(),
    getBlockedTimes(),
    getAppointmentSettings(),
  ]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure service types, providers, schedules, and booking policies
          </p>
        </div>
      </div>

      <ServiceTypeList serviceTypes={serviceTypes} />
      <ProviderList providers={providers} />
      <ProviderScheduleEditor providers={providers} />
      <BlockedTimeManager blockedTimes={blockedTimes} providers={providers} />
      <CancellationPolicyCard settings={settings} />
    </div>
  );
}
