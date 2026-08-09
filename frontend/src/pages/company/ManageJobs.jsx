import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { jobService } from '@/services/jobService'
import { Button } from '@/components/ui/Button'

export default function ManageJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobService.myJobs()
      .then(res => setJobs(res.data))
      .finally(() => setLoading(false))
  }, [])

  const toggleActive = async (job) => {
    await jobService.update(job.id, { is_active: !job.is_active })
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_active: !j.is_active } : j))
  }

  const deleteJob = async (id) => {
    if (!confirm('Delete this job posting?')) return
    await jobService.delete(id)
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  const JOB_TYPE_LABELS = {
    full_time: 'Full Time', part_time: 'Part Time',
    contract: 'Contract', internship: 'Internship',
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Jobs</h1>
          <p className="text-muted-foreground mt-1">{jobs.length} total posting{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/dashboard/post-job">
          <Button><PlusCircle className="h-4 w-4 mr-2" />Post a Job</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {jobs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No jobs posted yet.</p>
            <Link to="/dashboard/post-job" className="text-primary text-sm hover:underline mt-2 inline-block">
              Post your first job →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">City</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Clicks</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-medium">{job.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{JOB_TYPE_LABELS[job.job_type] || job.job_type}</td>
                  <td className="px-6 py-4 text-muted-foreground">{job.city}</td>
                  <td className="px-6 py-4">{job.clicks}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {job.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(job)}
                        title={job.is_active ? 'Deactivate' : 'Activate'}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        {job.is_active
                          ? <ToggleRight className="h-5 w-5 text-green-600" />
                          : <ToggleLeft className="h-5 w-5 text-gray-400" />
                        }
                      </button>
                      <button
                        onClick={() => deleteJob(job.id)}
                        title="Delete"
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
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
