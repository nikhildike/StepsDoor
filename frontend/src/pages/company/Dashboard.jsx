import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, MousePointerClick, PlusCircle, TrendingUp, Link2, Copy, Check } from 'lucide-react'
import { jobService } from '@/services/jobService'
import { companyService } from '@/services/companyService'

function CareerPageBanner({ slug }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/careers/${slug}`

  const copy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
      <div className="p-2 rounded-lg bg-primary/10">
        <Link2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Your Career Page</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline truncate block"
        >
          {url}
        </a>
      </div>
      <button
        onClick={copy}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-white transition-colors"
      >
        {copied ? <><Check className="h-3.5 w-3.5 text-green-600" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy link</>}
      </button>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-border p-6 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([jobService.myJobs(), companyService.get()])
      .then(([jobsRes, companyRes]) => {
        setJobs(jobsRes.data)
        setCompany(companyRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const activeJobs = jobs.filter(j => j.is_active).length
  const totalClicks = jobs.reduce((sum, j) => sum + (j.clicks || 0), 0)

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {company?.name || 'Company'}</h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your job listings.</p>
      </div>

      {company?.slug && <CareerPageBanner slug={company.slug} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Active Jobs" value={activeJobs} color="bg-blue-500" />
        <StatCard icon={MousePointerClick} label="Total Clicks" value={totalClicks} color="bg-green-500" />
        <StatCard icon={TrendingUp} label="Total Postings" value={jobs.length} color="bg-purple-500" />
        <div className="bg-white rounded-xl border border-border p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-orange-500">
            <PlusCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Quick Action</p>
            <Link to="/dashboard/post-job" className="text-sm font-semibold text-primary hover:underline">
              Post a new job →
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Job Postings</h2>
          <Link to="/dashboard/jobs" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {jobs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No jobs posted yet.</p>
            <Link to="/dashboard/post-job" className="text-primary text-sm hover:underline mt-2 inline-block">
              Post your first job →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Job Title</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Clicks</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 5).map(job => (
                <tr key={job.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-medium">{job.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{job.city}</td>
                  <td className="px-6 py-4">{job.clicks}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {job.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
