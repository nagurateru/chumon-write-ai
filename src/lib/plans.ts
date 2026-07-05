export const PLANS = {
  free: {
    key: 'free' as const,
    name: '無料プラン',
    price: 0,
    priceLabel: '無料',
    limit: 2,
    limitLabel: '累計2回まで',
    isMonthly: false,
    priceId: null,
    description: 'AIがどんな原稿を書くか試してみたい方に',
    features: ['原稿生成 2回（累計）'],
  },
  basic: {
    key: 'basic' as const,
    name: 'ベーシック',
    price: 14800,
    priceLabel: '¥14,800 / 月',
    limit: 30,
    limitLabel: '月30回',
    isMonthly: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID ?? 'price_1TkMfn3oc3hLzNbTz5qQGwEo',
    description: '毎月の入稿業務を効率化したい方に',
    features: ['原稿生成 30回 / 月'],
  },
  pro: {
    key: 'pro' as const,
    name: 'プロ',
    price: 17800,
    priceLabel: '¥17,800 / 月',
    limit: 100,
    limitLabel: '月100回',
    isMonthly: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? 'price_1TkMgG3oc3hLzNbTP65biXi0',
    description: '大量物件・複数スタッフで使う方に',
    features: ['原稿生成 100回 / 月'],
  },
} as const

export type PlanKey = keyof typeof PLANS
export type Plan = (typeof PLANS)[PlanKey]

export function getPlanByKey(key: string): Plan {
  return PLANS[key as PlanKey] ?? PLANS.free
}
