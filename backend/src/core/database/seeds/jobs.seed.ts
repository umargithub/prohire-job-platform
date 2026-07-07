import bcrypt from "bcrypt";
import { pool } from "../db";
import { logger } from "../../utils/logger";

if (process.env.NODE_ENV === "production") {
  logger.error("Seed script must not be run in production. Exiting.");
  process.exit(1);
}

const BCRYPT_ROUNDS = 12;
const DEFAULT_PASSWORD = "Company@123";

type JobType = "remote" | "hybrid" | "onsite";
type ExperienceLevel = "junior" | "mid" | "senior";

interface JobSeed {
  title: string;
  description: string;
  location: string | null;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
}

interface CompanySeed {
  ownerEmail: string;
  name: string;
  description: string;
  website: string;
  jobs: JobSeed[];
}

// Dedicated, well-known seed companies. Their jobs are wiped and re-inserted on
// every run, so the seed is idempotent and safe to re-run.
const COMPANY_SEEDS: CompanySeed[] = [
  {
    ownerEmail: "hiring@nimbus.dev",
    name: "Nimbus Cloud",
    description: "Developer-first cloud infrastructure platform.",
    website: "https://nimbus.dev",
    jobs: [
      {
        title: "Senior Backend Engineer (Node.js)",
        description:
          "Own our core API platform in TypeScript and PostgreSQL. You'll design services, tune queries, and mentor engineers. Deep experience with Node.js, SQL, and distributed systems required.",
        location: "San Francisco, CA",
        jobType: "hybrid",
        experienceLevel: "senior",
        salaryMin: 160000,
        salaryMax: 210000,
      },
      {
        title: "Platform Engineer",
        description:
          "Build and operate our Kubernetes-based deployment platform. Terraform, Go, and observability tooling are your daily bread.",
        location: "Remote (US)",
        jobType: "remote",
        experienceLevel: "mid",
        salaryMin: 130000,
        salaryMax: 165000,
      },
      {
        title: "Junior Frontend Developer",
        description:
          "Join the dashboard team building React and Next.js interfaces. Great first role for someone strong in TypeScript and CSS.",
        location: "San Francisco, CA",
        jobType: "onsite",
        experienceLevel: "junior",
        salaryMin: 90000,
        salaryMax: 115000,
      },
      {
        title: "Site Reliability Engineer",
        description:
          "Keep our multi-region infrastructure fast and reliable. On-call rotation, incident response, and automation-first mindset.",
        location: "Remote (US)",
        jobType: "remote",
        experienceLevel: "senior",
        salaryMin: 150000,
        salaryMax: 195000,
      },
      {
        title: "Product Designer",
        description:
          "Shape the end-to-end experience of our developer console. Figma, prototyping, and design-systems experience valued.",
        location: "New York, NY",
        jobType: "hybrid",
        experienceLevel: "mid",
        salaryMin: 120000,
        salaryMax: 150000,
      },
      {
        title: "Developer Advocate",
        description:
          "Write docs, give talks, and build sample apps that show off the platform. Strong writing and a coding background required.",
        location: "Remote (Global)",
        jobType: "remote",
        experienceLevel: "mid",
        salaryMin: 110000,
        salaryMax: 140000,
      },
    ],
  },
  {
    ownerEmail: "talent@finch-labs.io",
    name: "Finch Labs",
    description: "Fintech infrastructure for modern banking products.",
    website: "https://finch-labs.io",
    jobs: [
      {
        title: "Staff Software Engineer, Payments",
        description:
          "Lead the design of our ledger and payments engine. Correctness, idempotency, and money movement at scale are the hard problems here.",
        location: "New York, NY",
        jobType: "hybrid",
        experienceLevel: "senior",
        salaryMin: 180000,
        salaryMax: 240000,
      },
      {
        title: "Data Engineer",
        description:
          "Build the pipelines that power our analytics and reporting. Python, dbt, and warehouse modeling experience preferred.",
        location: "Remote (US)",
        jobType: "remote",
        experienceLevel: "mid",
        salaryMin: 135000,
        salaryMax: 170000,
      },
      {
        title: "Compliance Analyst",
        description:
          "Support KYC/AML programs and regulatory reporting. Detail-oriented, comfortable with financial regulations.",
        location: "New York, NY",
        jobType: "onsite",
        experienceLevel: "junior",
        salaryMin: 75000,
        salaryMax: 95000,
      },
      {
        title: "Security Engineer",
        description:
          "Own application and infrastructure security across the stack. Threat modeling, pentesting, and secure-by-default design.",
        location: "Remote (US)",
        jobType: "remote",
        experienceLevel: "senior",
        salaryMin: 165000,
        salaryMax: 205000,
      },
      {
        title: "Frontend Engineer, Dashboard",
        description:
          "Build the merchant-facing dashboard in React, TypeScript, and TanStack Query. Care about performance and accessibility.",
        location: "Austin, TX",
        jobType: "hybrid",
        experienceLevel: "mid",
        salaryMin: 125000,
        salaryMax: 160000,
      },
      {
        title: "Engineering Manager, Core",
        description:
          "Lead a team of six engineers building our core banking APIs. People-first leader with a strong technical background.",
        location: "New York, NY",
        jobType: "hybrid",
        experienceLevel: "senior",
        salaryMin: 190000,
        salaryMax: 250000,
      },
    ],
  },
  {
    ownerEmail: "jobs@verdant.eco",
    name: "Verdant",
    description: "Climate analytics for supply chains.",
    website: "https://verdant.eco",
    jobs: [
      {
        title: "Machine Learning Engineer",
        description:
          "Build models that estimate carbon emissions from noisy supply-chain data. Python, PyTorch, and MLOps experience.",
        location: "Remote (Global)",
        jobType: "remote",
        experienceLevel: "senior",
        salaryMin: 155000,
        salaryMax: 200000,
      },
      {
        title: "Full-Stack Engineer",
        description:
          "Work across our Next.js frontend and Node.js backend to ship customer-facing features end to end.",
        location: "Seattle, WA",
        jobType: "hybrid",
        experienceLevel: "mid",
        salaryMin: 130000,
        salaryMax: 165000,
      },
      {
        title: "Junior Data Analyst",
        description:
          "Turn emissions data into dashboards and insights. SQL and a curiosity about climate impact required.",
        location: "Seattle, WA",
        jobType: "onsite",
        experienceLevel: "junior",
        salaryMin: 80000,
        salaryMax: 100000,
      },
      {
        title: "Customer Success Engineer",
        description:
          "Help enterprise customers onboard and integrate our API. Technical, customer-facing, and comfortable with data.",
        location: "Remote (US)",
        jobType: "remote",
        experienceLevel: "mid",
        salaryMin: 100000,
        salaryMax: 130000,
      },
      {
        title: "Backend Engineer, Data Ingestion",
        description:
          "Scale the pipelines that ingest millions of supplier records daily. Node.js, PostgreSQL, and queue systems.",
        location: "Remote (Global)",
        jobType: "remote",
        experienceLevel: "mid",
        salaryMin: 125000,
        salaryMax: 160000,
      },
      {
        title: "Head of Design",
        description:
          "Define and lead the design vision across product and brand. Player-coach role for a senior design leader.",
        location: "Seattle, WA",
        jobType: "hybrid",
        experienceLevel: "senior",
        salaryMin: 175000,
        salaryMax: 220000,
      },
    ],
  },
  {
    ownerEmail: "careers@orbit-games.gg",
    name: "Orbit Games",
    description: "Building cross-platform multiplayer games.",
    website: "https://orbit-games.gg",
    jobs: [
      {
        title: "Gameplay Engineer (C++)",
        description:
          "Implement netcode and gameplay systems for our real-time multiplayer engine. Strong C++ and low-latency networking.",
        location: "Los Angeles, CA",
        jobType: "onsite",
        experienceLevel: "senior",
        salaryMin: 150000,
        salaryMax: 190000,
      },
      {
        title: "Backend Engineer, Live Services",
        description:
          "Build matchmaking, leaderboards, and player accounts. Node.js and Redis at scale, handling spiky traffic.",
        location: "Remote (US)",
        jobType: "remote",
        experienceLevel: "mid",
        salaryMin: 130000,
        salaryMax: 168000,
      },
      {
        title: "Junior QA Engineer",
        description:
          "Own automated and manual testing for game builds. Detail-oriented and passionate about game quality.",
        location: "Los Angeles, CA",
        jobType: "onsite",
        experienceLevel: "junior",
        salaryMin: 70000,
        salaryMax: 90000,
      },
      {
        title: "Technical Artist",
        description:
          "Bridge art and engineering — shaders, tooling, and pipelines. Unity or Unreal experience required.",
        location: "Hybrid — Los Angeles, CA",
        jobType: "hybrid",
        experienceLevel: "mid",
        salaryMin: 115000,
        salaryMax: 150000,
      },
      {
        title: "DevOps Engineer",
        description:
          "Manage build pipelines and game-server fleets across regions. Kubernetes, Terraform, and cost-aware scaling.",
        location: "Remote (US)",
        jobType: "remote",
        experienceLevel: "senior",
        salaryMin: 145000,
        salaryMax: 185000,
      },
      {
        title: "Community Manager",
        description:
          "Grow and engage our player community across Discord and social. Gaming-native communicator.",
        location: "Remote (Global)",
        jobType: "remote",
        experienceLevel: "junior",
        salaryMin: 65000,
        salaryMax: 85000,
      },
    ],
  },
];

async function seedJobs(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  let companyCount = 0;
  let jobCount = 0;

  for (const seed of COMPANY_SEEDS) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Owner user — upsert so we can recover the id whether new or existing.
      const userResult = await client.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, role, is_verified)
         VALUES ($1, $2, 'company', TRUE)
         ON CONFLICT (email)
           DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [seed.ownerEmail, passwordHash],
      );
      const ownerId = userResult.rows[0]!.id;

      // Company — owner_id is unique, so upsert on it.
      const companyResult = await client.query<{ id: string }>(
        `INSERT INTO companies (owner_id, name, description, website)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (owner_id)
           DO UPDATE SET name = EXCLUDED.name,
                         description = EXCLUDED.description,
                         website = EXCLUDED.website,
                         updated_at = NOW()
         RETURNING id`,
        [ownerId, seed.name, seed.description, seed.website],
      );
      const companyId = companyResult.rows[0]!.id;

      // Seat the owner in company_members (user_id unique).
      await client.query(
        `INSERT INTO company_members (company_id, user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (user_id) DO NOTHING`,
        [companyId, ownerId],
      );

      // Idempotent job refresh: wipe this company's jobs, then re-insert.
      await client.query(`DELETE FROM jobs WHERE company_id = $1`, [companyId]);

      for (const job of seed.jobs) {
        await client.query(
          `INSERT INTO jobs
             (company_id, title, description, location, job_type,
              experience_level, salary_min, salary_max, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
          [
            companyId,
            job.title,
            job.description,
            job.location,
            job.jobType,
            job.experienceLevel,
            job.salaryMin,
            job.salaryMax,
          ],
        );
        jobCount += 1;
      }

      await client.query("COMMIT");
      companyCount += 1;
      logger.info(
        { company: seed.name, jobs: seed.jobs.length },
        "Seeded company + jobs",
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  logger.info(
    { companies: companyCount, jobs: jobCount },
    "Jobs seed complete",
  );
}

async function main(): Promise<void> {
  try {
    await seedJobs();
  } catch (err) {
    logger.error({ err }, "Jobs seed failed");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().then(() => process.exit(process.exitCode ?? 0));
