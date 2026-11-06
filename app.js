(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const today = new Date();
  const dateKey = (d) => new Date(d).toISOString().slice(0, 10);
  const localDateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const storeKey = 'zenith-v1';
  const starter = { tasks: [], roadmap: null, activity: [], reminders: false, reminded: [] };
  let data;
  try { data = { ...starter, ...JSON.parse(localStorage.getItem(storeKey) || '{}') }; }
  catch { data = { ...starter }; }
  let activeView = 'today';
  let focusInterval = null;
  let focusRemaining = 25 * 60;
  let lastReminderCheck = Date.now();
  let toastTimer;

  function save() { localStorage.setItem(storeKey, JSON.stringify(data)); }
  function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function formatDate(date, opts = { weekday: 'long', month: 'long', day: 'numeric' }) { return new Intl.DateTimeFormat(undefined, opts).format(date); }
  function showToast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800); }
  function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function sortTasks(list) { return [...list].sort((a,b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99')) || Number(b.priority === 'high')-Number(a.priority === 'high')); }
  function dateLabel(key) { const d = new Date(`${key}T12:00:00`); const delta = Math.round((new Date(`${key}T00:00:00`) - new Date(`${localDateKey()}T00:00:00`)) / 86400000); if(delta === 0) return 'Today'; if(delta === 1) return 'Tomorrow'; if(delta === -1) return 'Yesterday'; return formatDate(d,{month:'short',day:'numeric'}); }
  function updateGreeting() { const h = new Date().getHours(); const greeting = h < 12 ? 'Good morning, explorer' : h < 18 ? 'Good day, explorer' : 'Good evening, explorer'; $('#greeting').innerHTML = `${greeting}<span class="heading-star"> ✦</span>`; $('#todayDate').textContent = formatDate(new Date()); }
  function render() {
    const todayKey = localDateKey();
    const todayTasks = sortTasks(data.tasks.filter(t => t.date === todayKey));
    const open = data.tasks.filter(t => !t.done).length;
    const todayDone = todayTasks.filter(t => t.done).length;
    const percent = todayTasks.length ? Math.round(todayDone / todayTasks.length * 100) : 0;
    $('#statToday').innerHTML = `${todayDone} <small>/ ${todayTasks.length}</small>`;
    $('#statOpen').textContent = open;
    $('#todayProgress').style.width = `${percent}%`;
    $('#todayPct').textContent = `${percent}%`;
    $('#navTodayCount').textContent = todayTasks.filter(t => !t.done).length;
    $('#statStreak').textContent = computeStreak();
    $('#notifyState').textContent = data.reminders ? 'On' : 'Off';
    $('#notifySetting').classList.toggle('active', data.reminders);

    const shown = activeView === 'today' ? todayTasks : sortTasks(data.tasks.filter(t => activeView === 'all' || t.date >= todayKey));
    $('#scheduleTitle').textContent = activeView === 'today' ? 'Today’s missions' : 'All missions';
    $('#crumbView').textContent = activeView === 'roadmap' ? 'Roadmaps' : activeView === 'all' ? 'All missions' : 'Today';
    $('#taskList').innerHTML = shown.map(taskRow).join('');
    $('#taskList').classList.toggle('hidden', shown.length === 0);
    $('#emptyState').classList.toggle('hidden', shown.length > 0);
    $('#addTaskInline').classList.toggle('hidden', shown.length === 0);
    $('#viewAllBtn').classList.toggle('hidden', activeView !== 'today');

    document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === activeView));
    renderRoadmap();
  }
  function taskRow(t) {
    const time = t.time ? new Date(`2000-01-01T${t.time}`).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : 'Anytime';
    const detail = [t.date !== localDateKey() ? dateLabel(t.date) : '', `${t.duration || 25} min`, t.notes].filter(Boolean).join(' · ');
    return `<div class="task-row" data-id="${escapeHtml(t.id)}"><input class="task-check" type="checkbox" aria-label="Mark ${escapeHtml(t.title)} complete" ${t.done?'checked':''}><span class="task-time">${escapeHtml(time)}</span><div class="task-main"><div class="task-title ${t.done?'done':''}">${escapeHtml(t.title)}</div><div class="task-meta">${escapeHtml(detail)}</div></div><span class="priority ${escapeHtml(t.priority||'medium')}">${t.priority==='high'?'High':t.priority==='low'?'Low':'Steady'}</span><button class="task-delete" aria-label="Delete mission" title="Delete mission">×</button></div>`;
  }
  function computeStreak() {
    const days = new Set(data.activity || []); const d = new Date(); let count = 0;
    if (!days.has(localDateKey(d))) d.setDate(d.getDate()-1);
    while (days.has(localDateKey(d))) { count++; d.setDate(d.getDate()-1); }
    return count;
  }
  function renderRoadmap() {
    const roadmap = data.roadmap;
    $('#emptyRoadmap').classList.toggle('hidden', !!roadmap);
    $('#roadmapContent').classList.toggle('visible', !!roadmap);
    if (!roadmap) { $('#roadmapContent').innerHTML = ''; return; }
    const completed = roadmap.steps.filter(s => s.done).length;
    $('#roadmapContent').innerHTML = `<div class="roadmap-head"><strong>${escapeHtml(roadmap.title)}</strong><span>${completed} of ${roadmap.steps.length} milestones complete · Target ${escapeHtml(dateLabel(roadmap.target))}</span></div><div class="milestone-list">${roadmap.steps.map((s,i)=>`<article class="milestone"><div class="milestone-dot">${s.done?'✓':i+1}</div><strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(dateLabel(s.date))} · ${escapeHtml(s.taskTitle)}</span></article>`).join('')}</div><div class="roadmap-actions"><button class="text-button" id="roadmapDelete">Remove roadmap <span>×</span></button></div>`;
    $('#roadmapDelete').addEventListener('click', () => { data.roadmap = null; data.tasks = data.tasks.filter(t => !t.roadmapId); save(); render(); showToast('Roadmap removed'); });
  }
  function openTask() {
    $('#taskForm').reset(); $('#taskDate').value = localDateKey(); $('#taskTime').value = '';
    $('#taskDialog').showModal(); setTimeout(() => $('#taskTitle').focus(), 20);
  }
  function saveTaskFromForm() {
    const title = $('#taskTitle').value.trim(); if (!title) return;
    data.tasks.push({ id:makeId(), title, date:$('#taskDate').value || localDateKey(), time:$('#taskTime').value, priority:$('#taskPriority').value, duration:Number($('#taskDuration').value), notes:$('#taskNotes').value.trim(), done:false, roadmapId:null });
    save(); $('#taskDialog').close(); activeView = data.tasks.at(-1).date === localDateKey() ? 'today' : 'all'; render(); showToast('Mission added to your orbit');
  }
  function toggleTask(id, checked) {
    const t = data.tasks.find(x => x.id === id); if (!t) return; t.done = checked;
    if (checked) { const key = localDateKey(); if (!data.activity.includes(key)) data.activity.push(key); if (data.roadmap && t.roadmapId) { const step = data.roadmap.steps.find(s=>s.taskId===id); if(step) step.done=true; } }
    else if (t.roadmapId && data.roadmap) { const step = data.roadmap.steps.find(s=>s.taskId===id); if(step) step.done=false; }
    save(); render(); showToast(checked ? 'Mission complete. Nice work.' : 'Mission back in progress');
  }
  function deleteTask(id) { const task = data.tasks.find(x=>x.id===id); data.tasks = data.tasks.filter(t=>t.id!==id); if(data.roadmap && task?.roadmapId) data.roadmap.steps=data.roadmap.steps.filter(s=>s.taskId!==id); save(); render(); showToast('Mission removed'); }

  const planSets = [
    { match:/exam|test|study|course|learn|certif|class/i, phases:[['Map the material','List the key topics and mark the ones that need the most attention.'],['Build a study rhythm','Work through one topic at a time and capture questions as they come up.'],['Practice and review','Use practice questions, revisit weak spots, and make a short review sheet.'],['Final check-in','Do a light recap, gather what you need, and protect time to rest.']] },
    { match:/launch|website|app|project|product|portfolio|business|build|create|design/i, phases:[['Set the scope','Define what “done” looks like and choose the smallest useful first version.'],['Gather the pieces','Collect references, tools, and any decisions you need to move forward.'],['Make the first version','Build the core pieces, then get an early look at what is working.'],['Polish and share','Fix the rough edges, prepare the launch, and share it with the right people.']] },
    { match:/run|fitness|train|health|habit|workout/i, phases:[['Choose a starting point','Pick a manageable baseline and decide how you will track progress.'],['Build consistency','Repeat a comfortable routine and make small increases when it feels right.'],['Stretch your capacity','Add one focused challenge while leaving room for recovery.'],['Review and reset','Notice what helped, celebrate progress, and set your next small target.']] },
    { match:/trip|travel|vacation|move|relocat/i, phases:[['Set the essentials','Confirm dates, budget, and the decisions that shape the rest of the plan.'],['Research options','Compare a few good choices and keep the details in one place.'],['Make the arrangements','Book or confirm the essentials and prepare what you will need.'],['Final readiness','Check the details, leave a little buffer, and enjoy the journey.']] }
  ];
  function buildPlan(e) {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const title=$('#goalTitle').value.trim(), target=$('#goalDate').value, selectedHours=$('#goalTime').value, hours=selectedHours==='custom'?Number($('#goalCustomTime').value):Number(selectedHours), context=$('#goalContext').value.trim();
    if(!title||!target) return;
    if(!Number.isFinite(hours)||hours<=0){ $('#goalCustomTime').focus(); showToast('Enter the hours you can give this goal each week'); return; }
    const targetDate=new Date(`${target}T12:00:00`), start=new Date(); start.setHours(12,0,0,0);
    const span=Math.max(4,Math.ceil((targetDate-start)/86400000));
    const templates=planSets.find(p=>p.match.test(title));
    const phases=templates?templates.phases:[['Clarify the destination','Write down what success looks like and what matters most.'],['Gather what you need','Find the information, tools, and support that will make the work easier.'],['Make steady progress','Break the work into focused sessions and tackle the next useful piece.'],['Review and finish','Check what is left, make final adjustments, and close the loop.']];
    const tasks=[]; const steps=phases.map((p,i)=>{
      const day=Math.max(1,Math.min(span,Math.round(span*(i+1)/phases.length)));
      const due=new Date(start); due.setDate(due.getDate()+day); const dueKey=due>targetDate?target:localDateKey(due);
      const taskTitle=`${p[0]}: ${title}`;
      const id=makeId(); const extra=i===0&&context?`Start here: ${context}`:p[1];
      tasks.push({id,title:taskTitle,date:dueKey,time:'',priority:i===0?'high':'medium',duration:hours>=6?45:25,notes:extra,done:false,roadmapId:null});
      return {title:p[0],date:dueKey,taskTitle,taskId:id,done:false};
    });
    const roadmapId=makeId(); tasks.forEach(t=>t.roadmapId=roadmapId);
    data.tasks.push(...tasks); data.roadmap={id:roadmapId,title,target,weeklyHours:hours,steps,createdAt:Date.now()}; save(); $('#roadmapDialog').close(); $('#roadmapForm').reset(); activeView='roadmap'; render(); $('#roadmapSection').scrollIntoView({behavior:'smooth',block:'center'}); showToast('Your roadmap is plotted. Adjust any step as you go.');
  }
  function setReminders() {
    if(!('Notification' in window)) { showToast('This browser does not support notifications'); return; }
    if(data.reminders) { data.reminders=false; save(); render(); showToast('Reminders paused'); return; }
    Notification.requestPermission().then(permission=>{
      if(permission==='granted') { data.reminders=true; save(); render(); showToast('Reminders are on while Zenith is open'); new Notification('Zenith reminders are on',{body:'Your upcoming missions can now send reminders.'}); }
      else showToast('Allow notifications in your browser settings to use reminders');
    });
  }
  function checkReminders() {
    const now=Date.now();
    if(data.reminders && 'Notification' in window && Notification.permission==='granted') {
      const prior=new Set(data.reminded);
      for(const t of data.tasks) {
        if(t.done) continue;
        const when = t.time ? new Date(`${t.date}T${t.time}:00`).getTime()-10*60*1000 : new Date(`${t.date}T09:00:00`).getTime();
        const key=`${t.id}:${t.date}`;
        if(!prior.has(key) && when>lastReminderCheck && when<=now) {
          try { new Notification(`Coming up: ${t.title}`,{body:t.time?`Starts in about 10 minutes · ${t.duration||25} minutes planned`:'One of today’s missions is ready when you are.',tag:key}); } catch {}
          data.reminded.push(key); prior.add(key);
        }
      }
      if(data.reminded.length>200) data.reminded=data.reminded.slice(-150);
      save();
    }
    lastReminderCheck=now;
  }
  function toggleCustomHours() { const custom=$('#goalTime').value==='custom'; $('#customHoursField').classList.toggle('hidden',!custom); $('#goalCustomTime').required=custom; }
  function openRoadmap() { $('#goalDate').value = localDateKey(new Date(Date.now()+30*86400000)); toggleCustomHours(); $('#roadmapDialog').showModal(); setTimeout(()=>$('#goalTitle').focus(),20); }
  function focusOpen() { $('#focusDialog').showModal(); $('#timerMission').textContent = sortTasks(data.tasks.filter(t=>t.date===localDateKey()&&!t.done))[0]?.title || 'Choose one thing. Let the rest wait.'; updateTimer(); }
  function updateTimer() { const min=String(Math.floor(focusRemaining/60)).padStart(2,'0'), sec=String(focusRemaining%60).padStart(2,'0'); $('#timerDisplay').textContent=`${min}:${sec}`; $('#timerProgress').style.width=`${(25*60-focusRemaining)/(25*60)*100}%`; }
  function timerStartPause() {
    if(focusInterval) { clearInterval(focusInterval); focusInterval=null; $('#timerToggle').textContent='Resume focus'; return; }
    $('#timerToggle').textContent='Pause';
    focusInterval=setInterval(()=>{ focusRemaining--; updateTimer(); if(focusRemaining<=0){ clearInterval(focusInterval); focusInterval=null; $('#timerToggle').textContent='Begin focus'; showToast('Focus session complete. Take a breath.'); try { if(data.reminders&&Notification.permission==='granted') new Notification('Focus session complete',{body:'Nice work. Take a small break.'}); } catch {} } },1000);
  }

  updateGreeting(); render();
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
  $('#goalTime').addEventListener('change',()=>{toggleCustomHours();if($('#goalTime').value==='custom')$('#goalCustomTime').focus();});
  $('#taskForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();saveTaskFromForm();});
  $('#roadmapForm').addEventListener('submit',buildPlan);
  $('#addTaskTop').addEventListener('click',openTask); $('#addTaskInline').addEventListener('click',openTask); $('#emptyAdd').addEventListener('click',openTask);
  $('#newRoadmap').addEventListener('click',openRoadmap); $('#emptyRoadmapBtn').addEventListener('click',openRoadmap); $('#heroPlan').addEventListener('click',openRoadmap);
  $('#viewAllBtn').addEventListener('click',()=>{activeView='all';render();});
  document.querySelectorAll('.nav-item[data-view]').forEach(el=>el.addEventListener('click',()=>{activeView=el.dataset.view;render();if(activeView==='roadmap')$('#roadmapSection').scrollIntoView({behavior:'smooth',block:'center'});else $('#scheduleSection').scrollIntoView({behavior:'smooth',block:'start'});}));
  $('#taskList').addEventListener('change',e=>{if(e.target.matches('.task-check'))toggleTask(e.target.closest('.task-row').dataset.id,e.target.checked);});
  $('#taskList').addEventListener('click',e=>{const b=e.target.closest('.task-delete');if(b)deleteTask(b.closest('.task-row').dataset.id);});
  $('#notifySetting').addEventListener('click',setReminders); $('#topNotify').addEventListener('click',setReminders);
  $('#focusStart').addEventListener('click',focusOpen); $('#timerToggle').addEventListener('click',e=>{e.preventDefault();timerStartPause();});
  $('#timerReset').addEventListener('click',e=>{e.preventDefault();if(focusInterval)clearInterval(focusInterval);focusInterval=null;focusRemaining=25*60;$('#timerToggle').textContent='Begin focus';updateTimer();});
  $('#focusDialog').addEventListener('close',()=>{if(focusInterval){clearInterval(focusInterval);focusInterval=null;$('#timerToggle').textContent='Resume focus';}});
  setInterval(checkReminders,30000); checkReminders();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders();});
})();

