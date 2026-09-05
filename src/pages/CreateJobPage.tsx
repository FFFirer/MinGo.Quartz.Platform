import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobApi, manifestApi } from '../api';
import PageHeader from '../components/PageHeader';
import JobTypeDisplay from '../components/JobTypeDisplay';
import type {
  CreateJobRequest,
  JobKeyDto,
  ScheduleDto,
  QuartzOptionsDto,
  JobTypeInfoDto,
  ParameterInfoDto,
  ScheduleType,
} from '../types';
import { formatJobKey, tryParseJson } from '../types';

const SCHEDULE_TYPES = [
  { value: 'Once' as ScheduleType, label: 'Once', description: 'Run one time' },
  { value: 'Cron' as ScheduleType, label: 'Cron', description: 'Cron expression' },
  { value: 'Interval' as ScheduleType, label: 'Interval', description: 'Repeat interval' },
  { value: 'None' as ScheduleType, label: 'None', description: 'No trigger' },
];

const MISFIRE_POLICIES = [
  { value: 'FireAndProceed', label: 'Fire and Proceed' },
  { value: 'IgnoreMisfire', label: 'Ignore Misfire' },
  { value: 'DoNothing', label: 'Do Nothing' },
];

const CRON_PRESETS = [
  { label: '每日午夜', value: '0 0 * * *' },
  { label: '每6小时', value: '0 */6 * * *' },
  { label: '每周一', value: '0 0 * * 1' },
];

function validateCron(expr: string): boolean {
  if (!expr.trim()) return false;
  const parts = expr.trim().split(/\s+/);
  return parts.length >= 5 && parts.length <= 7;
}

const CreateJobPage: React.FC = () => {
  const { schedulerName } = useParams<{ schedulerName: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const copyFrom = searchParams.get('copyFrom');

  const decodedSchedulerName = schedulerName ? decodeURIComponent(schedulerName) : '';

  // --- Data fetching ---
  const { data: manifest } = useQuery({
    queryKey: ['manifest', decodedSchedulerName],
    queryFn: async () => {
      const response = await manifestApi.get(decodedSchedulerName);
      if (!response.success) throw new Error(response.errorMessage);
      return response.data;
    },
    enabled: !!decodedSchedulerName,
  });

  // Fetch existing jobs for group list + copy
  const { data: existingJobs } = useQuery({
    queryKey: ['existing-jobs', decodedSchedulerName],
    queryFn: async () => {
      const resp = await jobApi.getAll(decodedSchedulerName, 1, 1000);
      if (!resp.success) throw new Error(resp.errorMessage);
      return resp.data?.items ?? [];
    },
    enabled: !!decodedSchedulerName,
  });

  // Fetch job to copy from
  const { data: copySource } = useQuery({
    queryKey: ['job', decodedSchedulerName, copyFrom],
    queryFn: async () => {
      if (!copyFrom) return null;
      const idx = copyFrom.indexOf('.');
      const copyJobKey: JobKeyDto = {
        name: idx > 0 ? copyFrom.substring(idx + 1) : copyFrom,
        group: idx > 0 ? copyFrom.substring(0, idx) : 'DEFAULT',
      };
      const resp = await jobApi.get(decodedSchedulerName, copyJobKey);
      if (!resp.success) throw new Error(resp.errorMessage);
      return resp.data;
    },
    enabled: !!decodedSchedulerName && !!copyFrom,
  });

  // Unique groups from existing jobs
  const existingGroups = useMemo(() => {
    const groups = new Set<string>();
    groups.add('DEFAULT');
    (existingJobs ?? []).forEach((j: any) => {
      if (j.group) groups.add(j.group);
    });
    return Array.from(groups).sort();
  }, [existingJobs]);

  // --- Form state ---
  const [group, setGroup] = useState('DEFAULT');
  const [isCustomGroup, setIsCustomGroup] = useState(false);
  const [customGroup, setCustomGroup] = useState('');
  const [jobName, setJobName] = useState('');
  const NAME_REGEX = /^[a-zA-Z0-9\-_]*$/;
  const [selectedJobType, setSelectedJobType] = useState('');
  const [params, setParams] = useState<Record<string, any>>({});
  const [scheduleType, setScheduleType] = useState<ScheduleType>('Cron');
  const [cronExpression, setCronExpression] = useState('0 0 * * *');
  const [intervalHours, setIntervalHours] = useState(0);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [intervalSeconds, setIntervalSeconds] = useState(0);
  const [runAt, setRunAt] = useState('');
  const [disallowConcurrent, setDisallowConcurrent] = useState(false);
  const [storeDurable, setStoreDurable] = useState(false);
  const [misfirePolicy, setMisfirePolicy] = useState('FireAndProceed');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [jobTypeDropdownOpen, setJobTypeDropdownOpen] = useState(false);
  const jobTypeRef = useRef<HTMLDivElement>(null);

  const selectedJob = manifest?.jobs?.find((j: JobTypeInfoDto) => j.key === selectedJobType);

  // Prefill from copy source
  useEffect(() => {
    if (copySource && copyFrom) {
      const idx = copyFrom.indexOf('.');
      const g = idx > 0 ? copyFrom.substring(0, idx) : 'DEFAULT';
      const n = idx > 0 ? copyFrom.substring(idx + 1) : copyFrom;
      setGroup(g);
      setJobName(n);

      // Try to match job type
      const matchingType = manifest?.jobs?.find(
        (j: JobTypeInfoDto) => j.jobTypeQualifiedName === copySource.jobType?.fullName
      );
      if (matchingType) {
        setSelectedJobType(matchingType.key);
      } else if (copySource.jobType?.fullName) {
        setSelectedJobType(copySource.jobType.fullName);
      }

      // Params
      const parsedParams = tryParseJson<Record<string, any>>(copySource.params, {});
      if (Object.keys(parsedParams).length > 0) {
        setParams(parsedParams);
      } else if (typeof copySource.params === 'object' && copySource.params !== null) {
        setParams(copySource.params as Record<string, any>);
      }

      // Schedule
      const parsedSchedule = tryParseJson<ScheduleDto>(copySource.schedule, {} as ScheduleDto);
      if (parsedSchedule && parsedSchedule.type) {
        setScheduleType(parsedSchedule.type as ScheduleType);
        if (parsedSchedule.cronExpression) setCronExpression(parsedSchedule.cronExpression);
        if (parsedSchedule.intervalSeconds) {
          const totalSec = parsedSchedule.intervalSeconds;
          setIntervalHours(Math.floor(totalSec / 3600));
          setIntervalMinutes(Math.floor((totalSec % 3600) / 60));
          setIntervalSeconds(totalSec % 60);
        }
        if (parsedSchedule.runAt) {
          try {
            const d = new Date(parsedSchedule.runAt);
            setRunAt(d.toISOString().slice(0, 16));
          } catch { /* ignore */ }
        }
      }

      // Options
      const parsedOptions = tryParseJson<QuartzOptionsDto>(copySource.options, {} as QuartzOptionsDto);
      if (parsedOptions) {
        setDisallowConcurrent(parsedOptions.disallowConcurrentExecution ?? false);
        setStoreDurable(parsedOptions.storeDurable ?? false);
        if (parsedOptions.misfirePolicy) setMisfirePolicy(parsedOptions.misfirePolicy);
      }
    }
  }, [copySource, copyFrom, manifest]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jobTypeRef.current && !jobTypeRef.current.contains(e.target as Node)) {
        setJobTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset params and schedule when job type changes
  const handleJobTypeChange = (key: string) => {
    setSelectedJobType(key);
    // Prefill default values from manifest
    const jobType = manifest?.jobs?.find((j: JobTypeInfoDto) => j.key === key);
    const defaultParams: Record<string, any> = {};
    if (jobType) {
      jobType.parameters.forEach((p: ParameterInfoDto) => {
        if (p.default !== undefined && p.default !== null) {
          defaultParams[p.name] = p.default;
        }
      });
    }
    setParams(defaultParams);
    setErrors({});
    setJobTypeDropdownOpen(false);
  };

  // Reset storeDurable when schedule type changes from None
  const handleScheduleTypeChange = (type: ScheduleType) => {
    setScheduleType(type);
    setErrors((p) => {
      const n = { ...p };
      delete n.cronExpression;
      delete n.interval;
      return n;
    });
    // Schedule 从 None 切到其他类型时，不清空 storeDurable（独立选项）
  };

  const handleParamChange = (name: string, value: any) => {
    setParams((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`param.${name}`];
      return next;
    });
  };

  // --- Create mutation ---
  const createJob = useMutation({
    mutationFn: (request: CreateJobRequest) => jobApi.create(decodedSchedulerName, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', decodedSchedulerName] });
      toast.success('Job created successfully!');
      navigate(`/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create job');
    },
  });

  // --- Validation ---
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!jobName.trim()) {
      newErrors.jobName = 'Job name is required';
    } else if (!NAME_REGEX.test(jobName)) {
      newErrors.jobName = 'Job name只能包含字母、数字、-和_';
    }

    if (!selectedJobType) {
      newErrors.jobType = 'Please select a job type';
    }

    // Validate required params
    if (selectedJob) {
      selectedJob.parameters
        .filter((p: ParameterInfoDto) => p.required)
        .forEach((p: ParameterInfoDto) => {
          const val = params[p.name];
          if (val === undefined || val === null || val === '') {
            newErrors[`param.${p.name}`] = '此字段为必填项';
          }
        });
    }

    if (scheduleType === 'Cron' && !validateCron(cronExpression)) {
      newErrors.cronExpression = 'Please enter a valid cron expression';
    }
    if (scheduleType === 'Interval') {
      const totalSec = intervalHours * 3600 + intervalMinutes * 60 + intervalSeconds;
      if (totalSec <= 0) {
        newErrors.interval = 'Interval must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const effectiveGroup = isCustomGroup ? customGroup.trim() || group : group;
    const jobKey: JobKeyDto = { name: jobName.trim(), group: effectiveGroup };

    let schedule: ScheduleDto;
    switch (scheduleType) {
      case 'None':
        schedule = { type: 'None' };
        break;
      case 'Cron':
        schedule = { type: 'Cron', cronExpression: cronExpression.trim() };
        break;
      case 'Interval': {
        const totalSec = intervalHours * 3600 + intervalMinutes * 60 + intervalSeconds;
        schedule = { type: 'Interval', intervalSeconds: totalSec };
        break;
      }
      case 'Once':
        schedule = {
          type: 'Once',
          runAt: runAt ? new Date(runAt).toISOString() : undefined,
        };
        break;
      default:
        schedule = { type: 'Cron', cronExpression: '0 0 * * *' };
    }

    const options: QuartzOptionsDto = {
      disallowConcurrentExecution: disallowConcurrent,
      storeDurable,
      requestRecovery: false,
      misfirePolicy: misfirePolicy as any,
    };

    const request: CreateJobRequest = {
      jobKey: jobKey,
      jobType: { fullName: selectedJob?.jobTypeQualifiedName ?? selectedJobType, assembly: '' },
      params,
      schedule,
      options,
    };

    createJob.mutate(request);
  };

  // Determine effective group value for display
  const effectiveGroup = isCustomGroup ? customGroup.trim() || group : group;
  const isSubmitting = createJob.isPending;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title={copyFrom ? 'Copy Job' : 'Create Job'}
        subtitle={`Scheduler: ${decodedSchedulerName}`}
        breadcrumbs={[
          { label: 'Schedulers', path: '/schedulers' },
          { label: decodedSchedulerName, path: `/schedulers/${encodeURIComponent(decodedSchedulerName)}` },
          { label: 'Jobs', path: `/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs` },
          { label: copyFrom ? 'Copy Job' : 'Create Job', active: true },
        ]}
      />

      {/* Copy notice */}
      {copyFrom && (
        <div className="mb-6 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm text-purple-300">
          Copying from: <span className="font-mono">{copyFrom}</span>. Modify fields below and submit to create a new job.
        </div>
      )}

      <div className="space-y-6">
        {/* ── SECTION: Job Identity ── */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Job Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Job Name (first column) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Job Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={jobName}
                onChange={(e) => {
                  setJobName(e.target.value);
                  if (errors.jobName) setErrors((p) => { const n = { ...p }; delete n.jobName; return n; });
                }}
                placeholder="e.g., daily-sync"
                className={`input ${errors.jobName ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.jobName && (
                <p className="mt-1 text-xs text-red-400">{errors.jobName}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Letters, digits, hyphens and underscores only
              </p>
            </div>

            {/* Group (second column) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Group</label>
              {!isCustomGroup ? (
                <div className="flex gap-2">
                  <select
                    value={group}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsCustomGroup(true);
                        setCustomGroup('');
                      } else {
                        setGroup(e.target.value);
                      }
                    }}
                    className="input flex-1"
                  >
                    {existingGroups.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="__new__">+ Create New</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customGroup}
                    onChange={(e) => setCustomGroup(e.target.value)}
                    placeholder="Enter custom group name"
                    className="input flex-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setIsCustomGroup(false); setCustomGroup(''); }}
                    className="btn-secondary text-sm px-3"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Jobs in the same group can be managed together
              </p>
            </div>
          </div>
          {effectiveGroup && jobName.trim() && (
            <div className="mt-3 p-2 bg-slate-700/40 rounded text-sm text-slate-400">
              Full Job Key: <span className="font-mono text-slate-50">{formatJobKey({ name: jobName.trim(), group: effectiveGroup })}</span>
            </div>
          )}
        </section>

        {/* ── SECTION: Job Type ── */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">
            Job Type <span className="text-red-500">*</span>
          </h2>
          {errors.jobType && (
            <p className="mb-3 text-xs text-red-400">{errors.jobType}</p>
          )}
          <div ref={jobTypeRef} className="relative">
            {/* ── Trigger Button ── */}
            <button
              type="button"
              onClick={() => setJobTypeDropdownOpen((prev) => !prev)}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-150 text-left ${
                selectedJobType
                  ? 'bg-blue-500/10 border-blue-500/50 hover:border-blue-400 ring-1 ring-blue-500/30'
                  : errors.jobType
                    ? 'border-red-500/50 bg-slate-700/20 hover:border-red-400'
                    : 'border-slate-700 bg-slate-700/20 hover:border-slate-500'
              }`}
            >
              {selectedJob ? (
                <div className="flex-1 min-w-0 relative">
                  <div className="absolute top-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow shadow-blue-500/30">
                    <Check size={11} className="text-white" />
                  </div>
                  <div className="font-semibold text-slate-50 truncate pr-8 leading-tight" title={(() => {
                    return selectedJob.jobTypeQualifiedName?.split('.').pop() ?? selectedJob.key;
                  })()}>
                    {(() => {
                      return selectedJob.jobTypeQualifiedName?.split('.').pop() ?? selectedJob.key;
                    })()}
                  </div>
                  <div className="mt-1 truncate">
                    <JobTypeDisplay
                      jobType={{ fullName: selectedJob.jobTypeQualifiedName ?? selectedJob.key, assembly: '' }}
                      size="sm"
                      showCopy={false}
                    />
                  </div>
                  {selectedJob.description && (
                    <div className="text-sm text-slate-400 mt-1 truncate leading-snug" title={selectedJob.description}>
                      {selectedJob.description}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1.5">
                    {selectedJob.parameters.length} parameter{selectedJob.parameters.length !== 1 ? 's' : ''}
                    {selectedJob.parameters.some((p: ParameterInfoDto) => p.required) && (
                      <span className="text-red-400 ml-1.5">
                        ({selectedJob.parameters.filter((p: ParameterInfoDto) => p.required).length} required)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className={`flex-1 text-sm ${errors.jobType ? 'text-red-400' : 'text-slate-400'}`}>
                  {errors.jobType ? 'Please select a job type' : 'Select a job type...'}
                </span>
              )}
              <ChevronDown
                size={18}
                className={`shrink-0 mt-0.5 text-slate-500 transition-transform duration-200 ${
                  jobTypeDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* ── Dropdown Panel ── */}
            {jobTypeDropdownOpen && manifest && manifest.jobs.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl shadow-black/40 overflow-hidden">
                <div className="max-h-[340px] overflow-y-auto space-y-1 p-2">
                  {manifest.jobs.map((job: JobTypeInfoDto) => {
                    const isSelected = selectedJobType === job.key;
                    const shortName = job.jobTypeQualifiedName?.split('.').pop() ?? job.key;
                    return (
                      <div
                        key={job.key}
                        onClick={() => handleJobTypeChange(job.key)}
                        className={`relative p-3 rounded-lg cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-blue-500/10 ring-1 ring-blue-500/50'
                            : 'hover:bg-slate-700/40'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow shadow-blue-500/30">
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                        <div className="font-semibold text-slate-50 truncate pr-8 leading-tight" title={shortName}>
                          {shortName}
                        </div>
                        <div className="mt-1 truncate">
                          <JobTypeDisplay
                            jobType={{ fullName: job.jobTypeQualifiedName ?? job.key, assembly: '' }}
                            size="sm"
                            showCopy={false}
                          />
                        </div>
                        {job.description && (
                          <div className="text-sm text-slate-400 mt-1 truncate leading-snug" title={job.description}>
                            {job.description}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-1.5">
                          {job.parameters.length} parameter{job.parameters.length !== 1 ? 's' : ''}
                          {job.parameters.some((p: ParameterInfoDto) => p.required) && (
                            <span className="text-red-400 ml-1.5">
                              ({job.parameters.filter((p: ParameterInfoDto) => p.required).length} required)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!manifest || manifest.jobs.length === 0) && (
              <p className="text-sm text-slate-500 mt-2">No job types available from manifest.</p>
            )}
          </div>
        </section>

        {/* ── SECTION: Parameters ── */}
        {selectedJob && (
          <section className="bg-slate-800 rounded-lg border border-slate-700 p-5">
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              Parameters
            </h2>
            {selectedJob.parameters.length === 0 ? (
              <p className="text-sm text-slate-500">No parameters required for this job type.</p>
            ) : (
              <div className="space-y-4">
                {selectedJob.parameters.map((param: ParameterInfoDto) => {
                  const errorKey = `param.${param.name}`;
                  return (
                    <div key={param.name}>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        {param.label || param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {param.type === 'bool' ? (
                        <select
                          value={params[param.name]?.toString() ?? param.default?.toString() ?? 'false'}
                          onChange={(e) => handleParamChange(param.name, e.target.value === 'true')}
                          className="input"
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : param.type === 'int' ? (
                        <input
                          type="number"
                          value={params[param.name] ?? param.default ?? ''}
                          onChange={(e) => handleParamChange(param.name, e.target.value ? parseInt(e.target.value) : '')}
                          className={`input ${errors[errorKey] ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                      ) : param.type === 'json' || param.type === 'object' ? (
                        <textarea
                          rows={4}
                          value={
                            params[param.name] !== undefined
                              ? typeof params[param.name] === 'string'
                                ? params[param.name]
                                : JSON.stringify(params[param.name], null, 2)
                              : param.default
                                ? typeof param.default === 'string'
                                  ? param.default
                                  : JSON.stringify(param.default, null, 2)
                                : ''
                          }
                          onChange={(e) => {
                            const raw = e.target.value;
                            // Try to parse as JSON; store raw string if parsing fails
                            try {
                              handleParamChange(param.name, raw.trim() ? JSON.parse(raw) : raw);
                            } catch {
                              handleParamChange(param.name, raw);
                            }
                          }}
                          className={`input font-mono text-xs ${errors[errorKey] ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder='{"key": "value"}'
                        />
                      ) : (
                        /* string or other types */
                        <input
                          type="text"
                          value={params[param.name] ?? param.default ?? ''}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                          placeholder={param.required ? 'Required' : 'Optional'}
                          className={`input ${errors[errorKey] ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                      )}

                      {errors[errorKey] && (
                        <p className="mt-1 text-xs text-red-400">{errors[errorKey]}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Type: {param.type}
                        {param.default !== undefined && param.default !== null && param.default !== '' && !['json', 'object'].includes(param.type)
                          ? ` (default: ${param.default})`
                          : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── SECTION: Schedule ── */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Schedule</h2>

          {/* Type selector */}
          <div className="flex gap-2 mb-4">
            {SCHEDULE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleScheduleTypeChange(t.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scheduleType === t.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* None */}
          {scheduleType === 'None' && (
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
              <p className="text-sm text-slate-300">
                Job will be created without a trigger. Use <span className="text-blue-400 font-mono">Trigger</span> action to fire manually.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                不创建 Trigger，Job 会保留在 Scheduler 中，直到后续添加 Trigger。
              </p>
            </div>
          )}

          {/* Cron */}
          {scheduleType === 'Cron' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Cron Expression</label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => {
                    setCronExpression(e.target.value);
                    if (errors.cronExpression) setErrors((p) => { const n = { ...p }; delete n.cronExpression; return n; });
                  }}
                  placeholder="0 0 * * *"
                  className={`input font-mono ${errors.cronExpression ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {errors.cronExpression && (
                  <p className="mt-1 text-xs text-red-400">{errors.cronExpression}</p>
                )}
                {validateCron(cronExpression) && !errors.cronExpression && (
                  <p className="mt-1 text-xs text-green-400">✓ Valid format</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setCronExpression(preset.value)}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                      cronExpression === preset.value
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 border border-slate-600'
                    }`}
                  >
                    {preset.label}
                    <span className="ml-1.5 text-slate-500">{preset.value}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Standard cron format: minute hour day month weekday
              </p>
            </div>
          )}

          {/* Interval */}
          {scheduleType === 'Interval' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Repeat every</label>
              <div className="flex gap-3 items-end">
                <div>
                  <span className="text-xs text-slate-500">Hours</span>
                  <input
                    type="number"
                    min="0"
                    value={intervalHours}
                    onChange={(e) => setIntervalHours(parseInt(e.target.value) || 0)}
                    className="input w-20"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500">Minutes</span>
                  <input
                    type="number"
                    min="0"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 0)}
                    className="input w-20"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500">Seconds</span>
                  <input
                    type="number"
                    min="0"
                    value={intervalSeconds}
                    onChange={(e) => setIntervalSeconds(parseInt(e.target.value) || 0)}
                    className="input w-20"
                  />
                </div>
              </div>
              {errors.interval && (
                <p className="mt-1 text-xs text-red-400">{errors.interval}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Total: {intervalHours}h {intervalMinutes}m {intervalSeconds}s
              </p>
            </div>
          )}

          {/* Once */}
          {scheduleType === 'Once' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Run At</label>
              <input
                type="datetime-local"
                value={runAt}
                onChange={(e) => setRunAt(e.target.value)}
                className="input max-w-xs"
              />
              <p className="mt-1 text-xs text-slate-500">Leave empty to run immediately</p>
            </div>
          )}
        </section>

        {/* ── SECTION: Options ── */}
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Options</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <div className="font-medium text-slate-50">持久化 Job (StoreDurable)</div>
                <div className="text-sm text-slate-400">
                  Job 在没有 Trigger 时也保留在 Scheduler 中，不会自动删除
                </div>
              </div>
              <input
                type="checkbox"
                checked={storeDurable}
                onChange={(e) => setStoreDurable(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <div className="font-medium text-slate-50">Disallow Concurrent Execution</div>
                <div className="text-sm text-slate-400">
                  Prevent this job from running multiple instances simultaneously
                </div>
              </div>
              <input
                type="checkbox"
                checked={disallowConcurrent}
                onChange={(e) => setDisallowConcurrent(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Misfire Policy</label>
              <select
                value={misfirePolicy}
                onChange={(e) => setMisfirePolicy(e.target.value)}
                className="input max-w-xs"
              >
                {MISFIRE_POLICIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">How to handle missed executions</p>
            </div>
          </div>
        </section>

        {/* ── Summary ── */}
        {selectedJobType && (
          <section className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Summary</h3>
            <div className="text-sm text-slate-400 space-y-1">
              <p>
                Job Key:{' '}
                <span className="text-slate-50 font-mono">
                  {formatJobKey({ name: jobName.trim() || '…', group: effectiveGroup })}
                </span>
              </p>
              <p>Type: <span className="text-slate-50">{selectedJobType}</span></p>
              <p>Schedule: <span className="text-slate-50">{scheduleType}</span></p>
              {Object.keys(params).length > 0 && (
                <p>Parameters: <span className="text-slate-50">{Object.keys(params).length} configured</span></p>
              )}
            </div>
          </section>
        )}

        {/* ── Actions ── */}
        <div className="flex justify-between pt-2 pb-8">
          <Link
            to={`/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs`}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Jobs
          </Link>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSubmitting ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateJobPage;
