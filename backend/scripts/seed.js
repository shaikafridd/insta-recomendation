const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}

const mongoose = require('mongoose');
const env = require('../config/env');
const { Reel } = require('../models/Reel');
const { Interaction } = require('../models/Interaction');

const sampleReels = [
  {
    title: 'Why Centering a Div with CSS Still Breaks Your Brain',
    topic: 'CSS Flexbox & Grid Layouts',
    caption: 'Flexbox vs CSS Grid in 45 seconds #webdev #frontend #css #javascript',
    transcript: 'If you are still struggling to center a div in 2025, here is the ultimate rule: display grid, place-items center. But when you have dynamic flex wraps, justify-content and align-items behave differently along the main axis vs cross axis.',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/sample_css_center.mp4',
    cloudinaryPublicId: 'sample_css_center',
    category: 'JavaScript',
    difficulty: 'Beginner',
    tags: ['css', 'javascript', 'frontend', 'humor', 'webdev'],
    hashtags: ['#webdev', '#frontend', '#css', '#javascript'],
    isHypeBait: false
  },
  {
    title: 'Designing a Distributed Rate Limiter with Token Bucket & Redis',
    topic: 'Distributed Systems & Rate Limiting',
    caption: 'System Design for high-throughput APIs handling 100k req/sec #hld #systemdesign #backend #redis',
    transcript: 'How do platforms like Stripe prevent API abuse? Let us design a distributed rate limiter. We compare Leaky Bucket with Token Bucket. Using Redis EVAL scripts, we atomically decrement tokens and reject requests exceeding capacity with 429 Too Many Requests.',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/sample_rate_limiter.mp4',
    cloudinaryPublicId: 'sample_rate_limiter',
    category: 'HLD',
    difficulty: 'Advanced',
    tags: ['system-design', 'hld', 'redis', 'backend', 'architecture', 'scalability'],
    hashtags: ['#hld', '#systemdesign', '#backend', '#redis', '#scalability'],
    isHypeBait: false
  },
  {
    title: 'Binary Search Edge Cases: Never Get Off-by-One Errors Again',
    topic: 'Algorithms & Binary Search Invariants',
    caption: 'Mastering the low <= high invariant in interview coding rounds #dsa #algorithms #leetcode #coding',
    transcript: 'Binary search looks simple until you hit the off-by-one infinite loop trap. Here is the trick: define your search space invariant. If low <= high, you must do low = mid + 1 and high = mid - 1. If low < high, high = mid.',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/sample_binary_search.mp4',
    cloudinaryPublicId: 'sample_binary_search',
    category: 'DSA',
    difficulty: 'Intermediate',
    tags: ['dsa', 'algorithms', 'interviews', 'python', 'coding'],
    hashtags: ['#dsa', '#algorithms', '#leetcode', '#coding', '#interviews'],
    isHypeBait: false
  },
  {
    title: '10 AI Tools That Will Get You Hired Instantly in 2025!',
    topic: 'Hype AI Cheatsheets',
    caption: 'Top secret AI cheatsheets that software engineers don’t want you to know 🚀💸 #ai #aitools #makemoney #clickbait',
    transcript: 'Stop learning to code! These 10 mind-blowing AI websites will build your resume, apply for 500 jobs while you sleep, and pass coding interviews automatically! Number 7 will shock you!',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/sample_hype_ai.mp4',
    cloudinaryPublicId: 'sample_hype_ai',
    category: 'AI',
    difficulty: 'Beginner',
    tags: ['hype', 'ai-tools', 'career-hacks', 'clickbait'],
    hashtags: ['#ai', '#aitools', '#makemoney', '#clickbait'],
    isHypeBait: true
  },
  {
    title: 'A Day in the Life of a Staff Backend Engineer at Scale',
    topic: 'Software Engineering Career & Architecture RFCs',
    caption: 'Balancing architecture RFCs, distributed tracing, and code reviews #backend #career #lifestyle #engineering',
    transcript: 'Morning starts with inspecting Grafana latency dashboards after last night deployment. Then reviewing an RFC for migrating database shards. Writing code is only 30% of senior engineering; communication and trade-off analysis is the other 70%.',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/sample_staff_engineer.mp4',
    cloudinaryPublicId: 'sample_staff_engineer',
    category: 'Career',
    difficulty: 'Intermediate',
    tags: ['career', 'backend', 'lifestyle', 'engineering-culture'],
    hashtags: ['#backend', '#career', '#lifestyle', '#engineering'],
    isHypeBait: false
  },
  {
    title: 'Zero-Downtime Blue/Green Deployments with Kubernetes & Ingress',
    topic: 'Cloud Infrastructure & Traffic Routing',
    caption: 'How production clusters deploy updates without dropping a single active request #cloud #devops #kubernetes',
    transcript: 'Blue-Green deployments maintain two identical production environments. The Ingress router shifts 100% traffic from version 1 to version 2 only when all health probe readiness checks pass.',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/sample_k8s_deploy.mp4',
    cloudinaryPublicId: 'sample_k8s_deploy',
    category: 'Cloud',
    difficulty: 'Advanced',
    tags: ['kubernetes', 'cloud', 'devops', 'docker', 'infrastructure'],
    hashtags: ['#cloud', '#devops', '#kubernetes', '#docker'],
    isHypeBait: false
  },
  {
    title: 'Building the Ultimate $1500 Custom Linux Gaming & Dev Rig',
    topic: 'Hardware & Linux Kernel Pass-through',
    caption: 'Ryzen 7800X3D + RTX 4070 Dual Boot Arch Linux Setup #hardware #gaming #linux #setup',
    transcript: 'Today we assemble a balanced machine for compile-heavy Rust builds and 1440p gaming. We cover GPU pass-through on Linux, thermal paste application, and undervolting settings in BIOS.',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/sample_pc_build.mp4',
    cloudinaryPublicId: 'sample_pc_build',
    category: 'Hardware',
    difficulty: 'Intermediate',
    tags: ['hardware', 'pc-building', 'gaming', 'linux', 'gadgets'],
    hashtags: ['#hardware', '#gaming', '#linux', '#setup'],
    isHypeBait: false
  },
  {
    title: 'When You Test Code Directly in Production on Friday at 5PM',
    topic: 'Developer Humor & CI/CD Safety',
    caption: 'Git push --force to main right before the weekend #programming #humor #meme #tech',
    transcript: 'POV: You decided to push a quick one-line bugfix directly to production 5 minutes before leaving the office. Suddenly PagerDuty starts screaming with 500 error alerts across all regions.',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/sample_friday_prod.mp4',
    cloudinaryPublicId: 'sample_friday_prod',
    category: 'Entertainment',
    difficulty: 'Beginner',
    tags: ['meme', 'humor', 'entertainment', 'programming-jokes'],
    hashtags: ['#programming', '#humor', '#meme', '#tech'],
    isHypeBait: false
  },
  {
    title: 'Anatomy of an SQL Injection Attack and How Parameterized Queries Fix It',
    topic: 'Application Security & Defensive Coding',
    caption: 'Understanding boolean-based blind SQLi and ORM security #cybersecurity #security #backend #infosec',
    transcript: 'Let us inspect what happens under the hood when user input gets directly concatenated into a SQL statement: admin or 1=1. We demonstrate how parameterized queries treat input strictly as literals rather than executable SQL code.',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/sample_sqli.mp4',
    cloudinaryPublicId: 'sample_sqli',
    category: 'Cybersecurity',
    difficulty: 'Intermediate',
    tags: ['cybersecurity', 'sql-injection', 'backend', 'infosec'],
    hashtags: ['#cybersecurity', '#security', '#backend', '#infosec'],
    isHypeBait: false
  }
];

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(env.MONGO_URI);
    console.log('[Seed] Connected to MongoDB');

    console.log('[Seed] Clearing existing Reels and Interactions collection...');
    await Reel.deleteMany({});
    await Interaction.deleteMany({});

    console.log(`[Seed] Inserting ${sampleReels.length} sample reels with topics & hashtags...`);
    const inserted = await Reel.insertMany(sampleReels);

    console.log(`[Seed] ✅ Successfully seeded ${inserted.length} reels into catalog:`);
    inserted.forEach((reel, idx) => {
      console.log(
        `  ${idx + 1}. [${reel.category}] "${reel.title}"\n     Topic: ${reel.topic}\n     Hashtags: ${reel.hashtags.join(' ')}\n     ID: ${reel._id}`
      );
    });

    console.log('\n[Seed] Finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error during seeding:', error.message);
    process.exit(1);
  }
};

seedData();
