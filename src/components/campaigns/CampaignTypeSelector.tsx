"use client";

import { CampaignType } from "@prisma/client";
import { cn } from "@/lib/utils/cn";
import {
  Calendar, ShoppingBag, Shield, Zap, Glasses, Clock, Users, Heart,
  Star, Wrench, Sparkles, Gift, RefreshCw, ArrowLeftRight, Activity,
  Package, Crown, BookOpen, Eye,
} from "lucide-react";

interface TypeConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  category: string;
  color: string;
}

const TYPE_CONFIGS: Record<CampaignType, TypeConfig> = {
  EXAM_REMINDER: {
    label: "Exam Reminder",
    description: "Annual eye exam reminder — 330-395 days since last exam",
    icon: Calendar,
    category: "Recall",
    color: "text-blue-600",
  },
  WALKIN_FOLLOWUP: {
    label: "Walk-in Follow-up",
    description: "Follow up with walk-in visitors who received a quote",
    icon: ShoppingBag,
    category: "Recall",
    color: "text-purple-600",
  },
  INSURANCE_RENEWAL: {
    label: "Insurance Renewal",
    description: "Remind patients to use vision benefits before they expire",
    icon: Shield,
    category: "Recall",
    color: "text-indigo-600",
  },
  ONE_TIME_BLAST: {
    label: "One-time Blast",
    description: "Send a message to all (or filtered) customers at once",
    icon: Zap,
    category: "Broadcast",
    color: "text-gray-600",
  },
  SECOND_PAIR: {
    label: "Second Pair",
    description: "Offer a second pair to customers who recently purchased",
    icon: Glasses,
    category: "Sales",
    color: "text-green-600",
  },
  PRESCRIPTION_EXPIRY: {
    label: "Rx Expiry",
    description: "Alert customers when prescription is about to expire",
    icon: Clock,
    category: "Recall",
    color: "text-orange-600",
  },
  ABANDONMENT_RECOVERY: {
    label: "Abandonment Recovery",
    description: "Win back customers who browsed but didn't buy",
    icon: ArrowLeftRight,
    category: "Recovery",
    color: "text-red-600",
  },
  FAMILY_ADDON: {
    label: "Family Add-on",
    description: "Reach family members who haven't ordered yet",
    icon: Users,
    category: "Growth",
    color: "text-teal-600",
  },
  INSURANCE_MAXIMIZATION: {
    label: "Insurance Max",
    description: "Help patients maximize expiring insurance benefits",
    icon: Shield,
    category: "Sales",
    color: "text-indigo-600",
  },
  POST_PURCHASE_REFERRAL: {
    label: "Post-Purchase Referral",
    description: "Ask happy customers to refer friends and family",
    icon: Heart,
    category: "Growth",
    color: "text-pink-600",
  },
  VIP_INSIDER: {
    label: "VIP Insider",
    description: "Exclusive updates for top customers (3+ orders or $2000+)",
    icon: Crown,
    category: "Loyalty",
    color: "text-amber-600",
  },
  DAMAGE_REPLACEMENT: {
    label: "Damage Replacement",
    description: "Prompt customers with 1-1.5 year old frames to replace",
    icon: Wrench,
    category: "Sales",
    color: "text-gray-600",
  },
  STYLE_EVOLUTION: {
    label: "Style Evolution",
    description: "Inspire customers with new styles based on past purchases",
    icon: Sparkles,
    category: "Engagement",
    color: "text-violet-600",
  },
  BIRTHDAY_ANNIVERSARY: {
    label: "Birthday",
    description: "Birthday greetings with a special offer",
    icon: Gift,
    category: "Loyalty",
    color: "text-pink-600",
  },
  DORMANT_REACTIVATION: {
    label: "Dormant Reactivation",
    description: "Re-engage customers inactive for 2+ years",
    icon: RefreshCw,
    category: "Recovery",
    color: "text-orange-600",
  },
  COMPETITOR_SWITCHER: {
    label: "Competitor Switcher",
    description: "Convert patients who had exams but ordered elsewhere",
    icon: ArrowLeftRight,
    category: "Growth",
    color: "text-red-600",
  },
  LIFESTYLE_MARKETING: {
    label: "Lifestyle",
    description: "Match products to customer lifestyle (sports, screen time, etc.)",
    icon: Activity,
    category: "Engagement",
    color: "text-cyan-600",
  },
  AGING_INVENTORY: {
    label: "Aging Inventory",
    description: "Move frames that have been in stock 180+ days",
    icon: Package,
    category: "Inventory",
    color: "text-yellow-600",
  },
  NEW_ARRIVAL_VIP: {
    label: "New Arrival VIP",
    description: "Notify VIP customers about new inventory",
    icon: Star,
    category: "Inventory",
    color: "text-amber-600",
  },
  EDUCATIONAL_NURTURE: {
    label: "Educational",
    description: "Educate customers with tips and eye health content",
    icon: BookOpen,
    category: "Engagement",
    color: "text-blue-600",
  },
  LENS_EDUCATION: {
    label: "Lens Education",
    description: "Suggest lens upgrades based on current prescription",
    icon: Eye,
    category: "Sales",
    color: "text-teal-600",
  },
};

const CATEGORIES = ["Recall", "Sales", "Recovery", "Growth", "Loyalty", "Engagement", "Inventory", "Broadcast"];

interface Props {
  selected: CampaignType | null;
  onSelect: (type: CampaignType) => void;
}

export function CampaignTypeSelector({ selected, onSelect }: Props) {
  const byCategory = CATEGORIES.reduce<Record<string, [CampaignType, TypeConfig][]>>((acc, cat) => {
    acc[cat] = (Object.entries(TYPE_CONFIGS) as [CampaignType, TypeConfig][]).filter(
      ([, cfg]) => cfg.category === cat
    );
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {CATEGORIES.map((category) => {
        const items = byCategory[category];
        if (!items?.length) return null;
        return (
          <div key={category}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map(([type, cfg]) => {
                const Icon = cfg.icon;
                const isSelected = selected === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onSelect(type)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", cfg.color)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{cfg.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {cfg.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
