import { CampaignType } from "@prisma/client";

export interface DripStep {
  stepIndex: number;
  delayDays: number;
  channel: "SMS" | "EMAIL";
  templateBody: string;
  templateSubject?: string;
}

export interface CampaignConfig {
  steps: DripStep[];
  stopOnConversion: boolean;
  cooldownDays: number;
  enrollmentMode: "auto" | "manual";
}

export const DRIP_PRESETS: Partial<Record<CampaignType, CampaignConfig>> = {
  EXAM_REMINDER: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "SMS",
        templateBody:
          "Hi {{firstName}}! It's been about a year since your last eye exam at {{storeName}}. Keep your vision sharp — book your annual exam today. Call us at {{storePhone}}.",
      },
      {
        stepIndex: 1,
        delayDays: 14,
        channel: "EMAIL",
        templateSubject: "Your Annual Eye Exam Reminder — {{storeName}}",
        templateBody:
          "Dear {{firstName}},\n\nYour last eye exam was about a year ago. Regular eye exams are the best way to catch vision changes early.\n\nBook your appointment today at {{storeName}}.\n\nCall: {{storePhone}}\n\nSee you soon!",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 365,
    enrollmentMode: "auto",
  },

  WALKIN_FOLLOWUP: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 2,
        channel: "SMS",
        templateBody:
          "Hi {{firstName}}! Thanks for visiting {{storeName}}. Still thinking about those frames? We'd love to help you find the perfect pair. Call us at {{storePhone}}.",
      },
      {
        stepIndex: 1,
        delayDays: 7,
        channel: "EMAIL",
        templateSubject: "We saved your favourites — {{storeName}}",
        templateBody:
          "Hi {{firstName}},\n\nWe loved having you in the store! The frames you tried on are still waiting for you.\n\nWe offer a comfortable, low-pressure experience and our team is here to help.\n\nCome back anytime or call {{storePhone}} to reserve your favourites.",
      },
      {
        stepIndex: 2,
        delayDays: 14,
        channel: "SMS",
        templateBody:
          "{{firstName}}, your visit to {{storeName}} is still on our mind! We have a special offer this week. Call {{storePhone}} to learn more.",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 90,
    enrollmentMode: "auto",
  },

  SECOND_PAIR: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "Protect your backup pair — exclusive second-pair offer",
        templateBody:
          "Hi {{firstName}},\n\nNow that you're loving your {{frameBrand}} frames, have you thought about a backup pair? Accidents happen!\n\nAs a valued customer, we're offering you a special deal on a second pair. Call us at {{storePhone}} or stop in at {{storeName}}.",
      },
      {
        stepIndex: 1,
        delayDays: 21,
        channel: "SMS",
        templateBody:
          "{{firstName}}, two pairs are always better than one! Ask us about our second-pair special at {{storeName}}. {{storePhone}}",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 180,
    enrollmentMode: "auto",
  },

  PRESCRIPTION_EXPIRY: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "SMS",
        templateBody:
          "Hi {{firstName}}! Your prescription expires on {{rxExpiryDate}}. Book your eye exam soon to stay current. Call {{storeName}} at {{storePhone}}.",
      },
      {
        stepIndex: 1,
        delayDays: 14,
        channel: "EMAIL",
        templateSubject: "Your prescription is expiring — time to book your exam",
        templateBody:
          "Dear {{firstName}},\n\nYour current prescription expires on {{rxExpiryDate}}. An up-to-date prescription ensures you're seeing your best.\n\nBook your exam at {{storeName}} today. Call {{storePhone}}.",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 365,
    enrollmentMode: "auto",
  },

  ABANDONMENT_RECOVERY: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 7,
        channel: "SMS",
        templateBody:
          "Hi {{firstName}}! Still thinking about your visit to {{storeName}}? We'd love to help you find the perfect pair. Call us at {{storePhone}}.",
      },
      {
        stepIndex: 1,
        delayDays: 14,
        channel: "EMAIL",
        templateSubject: "We have a price match guarantee — {{storeName}}",
        templateBody:
          "Hi {{firstName}},\n\nWe understand choosing frames is a big decision. At {{storeName}}, we offer a price match guarantee and a 30-day satisfaction promise.\n\nCome back and let us take care of you. Call {{storePhone}}.",
      },
      {
        stepIndex: 2,
        delayDays: 21,
        channel: "SMS",
        templateBody:
          "{{firstName}}, we're offering an exclusive discount this week for returning visitors. Call {{storeName}} at {{storePhone}} — mention this text!",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 90,
    enrollmentMode: "auto",
  },

  POST_PURCHASE_REFERRAL: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 3,
        channel: "SMS",
        templateBody:
          "Hi {{firstName}}! Loving your new frames? Share the love — refer a friend to {{storeName}} and you both get a reward. Ask us for details at {{storePhone}}.",
      },
      {
        stepIndex: 1,
        delayDays: 10,
        channel: "EMAIL",
        templateSubject: "Share {{storeName}} with a friend — earn rewards",
        templateBody:
          "Hi {{firstName}},\n\nWe hope you're enjoying your new eyewear! When you refer a friend to {{storeName}}, you both benefit.\n\nSimply have them mention your name when they visit or call {{storePhone}}.",
      },
    ],
    stopOnConversion: false,
    cooldownDays: 180,
    enrollmentMode: "auto",
  },

  VIP_INSIDER: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "You're a VIP at {{storeName}} — exclusive access inside",
        templateBody:
          "Dear {{firstName}},\n\nAs one of our most valued customers, you get first access to new arrivals and exclusive offers.\n\nWatch for our VIP-only updates. In the meantime, call {{storePhone}} for personalized assistance.",
      },
    ],
    stopOnConversion: false,
    cooldownDays: 60,
    enrollmentMode: "auto",
  },

  BIRTHDAY_ANNIVERSARY: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "SMS",
        templateBody:
          "Happy Birthday {{firstName}}! 🎂 As a gift from {{storeName}}, enjoy a special birthday treat on your next visit. Call us at {{storePhone}}!",
      },
    ],
    stopOnConversion: false,
    cooldownDays: 365,
    enrollmentMode: "auto",
  },

  DORMANT_REACTIVATION: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "We miss you, {{firstName}} — come back to {{storeName}}",
        templateBody:
          "Hi {{firstName}},\n\nIt's been a while since we've seen you at {{storeName}}! A lot has changed — new frames, new technology, and the same great service.\n\nWe'd love to welcome you back. Call {{storePhone}} or stop in anytime.",
      },
      {
        stepIndex: 1,
        delayDays: 21,
        channel: "SMS",
        templateBody:
          "Hi {{firstName}}, {{storeName}} has exciting new frames in stock! It's been too long — come see us. {{storePhone}}",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 365,
    enrollmentMode: "auto",
  },

  INSURANCE_RENEWAL: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "SMS",
        templateBody:
          "Hi {{firstName}}! Your vision insurance with {{insuranceProvider}} renews in {{insuranceRenewalMonth}}. Book your annual exam at {{storeName}} to use your benefits. Call {{storePhone}}.",
      },
      {
        stepIndex: 1,
        delayDays: 14,
        channel: "EMAIL",
        templateSubject: "Your {{insuranceProvider}} vision benefits renew in {{insuranceRenewalMonth}}",
        templateBody:
          "Dear {{firstName}},\n\nYour vision insurance with {{insuranceProvider}} renews in {{insuranceRenewalMonth}}. Don't let your benefits go unused!\n\nBook your annual eye exam and select new frames before your benefits reset.\n\nCall {{storeName}} at {{storePhone}} to schedule your appointment.",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 365,
    enrollmentMode: "auto",
  },

  INSURANCE_MAXIMIZATION: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "Use your {{insuranceProvider}} benefits before they expire",
        templateBody:
          "Dear {{firstName}},\n\nYour {{insuranceProvider}} vision benefits renew in {{insuranceRenewalMonth}}. Don't let unused benefits go to waste!\n\nBook your eye exam and choose new frames before your benefits reset. Call {{storeName}} at {{storePhone}}.",
      },
      {
        stepIndex: 1,
        delayDays: 14,
        channel: "SMS",
        templateBody:
          "{{firstName}}, your vision insurance renews in {{insuranceRenewalMonth}}. Use your benefits at {{storeName}} before they expire! {{storePhone}}",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 365,
    enrollmentMode: "auto",
  },

  DAMAGE_REPLACEMENT: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "SMS",
        templateBody:
          "Hi {{firstName}}! Your {{frameBrand}} frames are getting some mileage. Time to upgrade or get a backup pair? Visit {{storeName}} or call {{storePhone}}.",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 180,
    enrollmentMode: "auto",
  },

  COMPETITOR_SWITCHER: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "Your prescription is ready — let us fill it at {{storeName}}",
        templateBody:
          "Hi {{firstName}},\n\nWe noticed you had an eye exam but haven't filled your prescription with us yet. At {{storeName}}, we offer a wide selection of frames and expert fitting.\n\nLet us take care of you. Call {{storePhone}} today.",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 180,
    enrollmentMode: "auto",
  },

  NEW_ARRIVAL_VIP: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "New arrivals just for you — {{storeName}} VIP preview",
        templateBody:
          "Hi {{firstName}},\n\nAs one of our top customers, you get first look at our latest frames. New inventory just arrived at {{storeName}}!\n\nCall {{storePhone}} to schedule a private viewing or come in anytime.",
      },
    ],
    stopOnConversion: false,
    cooldownDays: 14,
    enrollmentMode: "auto",
  },

  LIFESTYLE_MARKETING: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "Frames for your lifestyle — {{storeName}}",
        templateBody:
          "Hi {{firstName}},\n\nEvery lifestyle deserves the right eyewear. Whether you're at a screen all day or enjoying the outdoors, we have frames made for you.\n\nVisit {{storeName}} or call {{storePhone}} to explore our curated collection.",
      },
    ],
    stopOnConversion: false,
    cooldownDays: 90,
    enrollmentMode: "auto",
  },

  EDUCATIONAL_NURTURE: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "5 things your optician wants you to know",
        templateBody:
          "Hi {{firstName}},\n\nDid you know that UV protection matters even on cloudy days? Or that blue light from screens can affect your sleep?\n\nAt {{storeName}}, we're here to help you see better and live better. Call {{storePhone}} with any questions.",
      },
    ],
    stopOnConversion: false,
    cooldownDays: 90,
    enrollmentMode: "auto",
  },

  LENS_EDUCATION: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "Upgrade your lenses — see the difference at {{storeName}}",
        templateBody:
          "Hi {{firstName}},\n\nTechnology in lenses has come a long way. Anti-reflective coatings, progressive lenses, photochromic tints — we can help you find the upgrade that's right for you.\n\nAsk our team at {{storeName}}. Call {{storePhone}}.",
      },
    ],
    stopOnConversion: false,
    cooldownDays: 90,
    enrollmentMode: "auto",
  },

  AGING_INVENTORY: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "Special pricing on select frames — {{storeName}}",
        templateBody:
          "Hi {{firstName}},\n\nWe're offering special pricing on select frames at {{storeName}} — perfect timing to upgrade or get that second pair you've been considering.\n\nStop in or call {{storePhone}} while supplies last.",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 60,
    enrollmentMode: "auto",
  },

  STYLE_EVOLUTION: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "Your style is evolving — new frames at {{storeName}}",
        templateBody:
          "Hi {{firstName}},\n\nFashion changes, and so does eyewear! Based on your past purchases, we've curated some new arrivals we think you'll love.\n\nVisit {{storeName}} or call {{storePhone}} to see what's new.",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 60,
    enrollmentMode: "auto",
  },

  ONE_TIME_BLAST: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "SMS",
        templateBody:
          "Hi {{firstName}}! {{storeName}} has a special announcement for you. Call us at {{storePhone}} or check in for details.",
      },
    ],
    stopOnConversion: false,
    cooldownDays: 30,
    enrollmentMode: "manual",
  },

  FAMILY_ADDON: {
    steps: [
      {
        stepIndex: 0,
        delayDays: 0,
        channel: "EMAIL",
        templateSubject: "Family eyecare at {{storeName}} — see together",
        templateBody:
          "Hi {{firstName}},\n\nWe love caring for your whole family's vision! Does everyone in your family have their glasses and annual exams up to date?\n\nBring the whole family to {{storeName}} — we make it easy. Call {{storePhone}}.",
      },
    ],
    stopOnConversion: true,
    cooldownDays: 180,
    enrollmentMode: "auto",
  },
};

export function getDripConfig(type: CampaignType): CampaignConfig {
  return (
    DRIP_PRESETS[type] ?? {
      steps: [
        {
          stepIndex: 0,
          delayDays: 0,
          channel: "SMS" as const,
          templateBody: "Hi {{firstName}}! A message from {{storeName}}. Call {{storePhone}}.",
        },
      ],
      stopOnConversion: false,
      cooldownDays: 30,
      enrollmentMode: "auto",
    }
  );
}
