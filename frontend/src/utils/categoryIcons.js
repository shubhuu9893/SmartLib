import {
  Atom,
  BookHeart,
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  Code2,
  Cpu,
  Feather,
  HeartPulse,
  Landmark,
  Lightbulb,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  User,
  Wand2,
  Wrench,
  Scale,
} from 'lucide-react';

const ICONS = {
  technology: Cpu,
  science: Atom,
  'ai-ml': Sparkles,
  programming: Code2,
  business: Briefcase,
  finance: TrendingUp,
  history: Landmark,
  fiction: BookOpen,
  fantasy: Wand2,
  romance: BookHeart,
  mystery: Search,
  biography: User,
  'self-help': Lightbulb,
  psychology: Brain,
  engineering: Wrench,
  mathematics: Calculator,
  'science-fiction': Rocket,
  philosophy: Scale,
  poetry: Feather,
  health: HeartPulse,
};

const TINTS = [
  'from-blue-500/20 to-blue-500/5 text-blue-300',
  'from-violet-500/20 to-violet-500/5 text-violet-300',
  'from-cyan-500/20 to-cyan-500/5 text-cyan-300',
  'from-emerald-500/20 to-emerald-500/5 text-emerald-300',
  'from-amber-500/20 to-amber-500/5 text-amber-300',
  'from-rose-500/20 to-rose-500/5 text-rose-300',
];

export function categoryIcon(id) {
  return ICONS[id] || BookOpen;
}

export function categoryTint(index) {
  return TINTS[index % TINTS.length];
}
