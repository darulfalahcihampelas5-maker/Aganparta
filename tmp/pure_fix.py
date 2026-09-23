import os

with open('src/pages/DashboardTeacher.tsx', 'rb') as f:
    data = f.read()

marker = b'Terbit: {exam.createdAt ? new Date(exam.createdAt).toLocaleDateString("id-ID"'
idx = data.find(marker)
if idx != -1:
    prefix = data[:idx].decode('utf-8')
else:
    # If already partially replaced, find the <h5 className=
    marker = b'<h5 className="text-lg font-black text-slate-800 font-display">'
    idx = data.rfind(marker)
    prefix = data[:idx].decode('utf-8')
    prefix += """<h5 className="text-lg font-black text-slate-800 font-display">
                                  {exam.title}
                                </h5>
                                <p className="text-xs font-semibold text-slate-400">
                                  """

closing_code = """Terbit: {exam.createdAt ? new Date(exam.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"} • KKM: <span className="text-slate-700 font-bold">{kkm}</span> • Total Soal: <span className="text-slate-700 font-bold">{exam.questions?.length || 0}</span>
                                </p>
                              </div>

                              <div className="flex flex-wrap md:flex-nowrap items-center gap-4 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                                {score !== undefined && (
                                  <div className="flex-1 md:flex-initial text-left md:text-right pr-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                      Status Pengawasan
                                    </p>
                                    {violationCount > 0 ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#85cc00]/10 text-[#85cc00] border border-[#85cc00]/20 uppercase text-[10px] font-black tracking-wider animate-pulse">
                                        🚨 {violationCount}x Pelanggaran
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase text-[10px] font-black tracking-wider">
                                        🟢 Aman / Tertib
                                      </span>
                                    )}
                                  </div>
                                )}

                                {score !== undefined ? (
                                  <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shrink-0">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Nilai:</span>
                                    <span className={`text-2xl font-black font-display ${score >= kkm ? "text-emerald-500" : "text-[#85cc00]"}`}>
                                      {score}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-black bg-slate-100 text-slate-400 border border-slate-200 px-3 py-1 rounded-md uppercase tracking-wider shrink-0">
                                    Belum Ujian
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
"""

full_content = prefix + closing_code

with open('src/pages/DashboardTeacher.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(full_content)

print("Successfully written pure clean DashboardTeacher.tsx!")
