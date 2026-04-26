const state = {
  tasks: JSON.parse(localStorage.getItem('timebox_tasks') || '[]'),
  activeTaskId: null,
  remainingSeconds: 0,
  totalSeconds: 0,
  timer: null,
  running: false,
};

function saveTasks() {
  localStorage.setItem('timebox_tasks', JSON.stringify(state.tasks));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTasks() {
  const list = document.getElementById('taskList');
  if (state.tasks.length === 0) {
    list.innerHTML = '<p class="empty-message">タスクを追加してください</p>';
    return;
  }

  list.innerHTML = state.tasks.map(task => `
    <div class="task-item ${task.completed ? 'completed' : ''} ${state.activeTaskId === task.id ? 'active' : ''}" data-id="${task.id}">
      <span class="task-name">${escapeHtml(task.name)}</span>
      <span class="task-duration">${task.minutes}分</span>
      <div class="task-actions">
        ${!task.completed && state.activeTaskId !== task.id
          ? `<button class="btn-start" onclick="startTask('${task.id}')">▶ スタート</button>`
          : ''}
        <button class="btn-delete" onclick="deleteTask('${task.id}')">削除</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function addTask() {
  const nameInput = document.getElementById('taskName');
  const minutesInput = document.getElementById('taskMinutes');
  const name = nameInput.value.trim();
  const minutes = parseInt(minutesInput.value, 10);

  if (!name) {
    showNotification('タスク名を入力してください');
    return;
  }
  if (!minutes || minutes < 1) {
    showNotification('1分以上の時間を設定してください');
    return;
  }

  state.tasks.push({ id: generateId(), name, minutes, completed: false });
  saveTasks();
  nameInput.value = '';
  minutesInput.value = '25';
  renderTasks();
}

function startTask(id) {
  if (state.running) stopTimer();

  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  state.activeTaskId = id;
  state.totalSeconds = task.minutes * 60;
  state.remainingSeconds = state.totalSeconds;
  state.running = false;

  document.getElementById('currentTaskName').textContent = task.name;
  document.getElementById('timerDisplay').textContent = formatTime(state.remainingSeconds);
  document.getElementById('progressBar').style.width = '100%';
  document.getElementById('startPauseBtn').textContent = 'スタート';
  document.getElementById('timerSection').classList.remove('hidden');

  renderTasks();
}

function toggleStartPause() {
  if (state.activeTaskId === null) return;

  if (state.running) {
    clearInterval(state.timer);
    state.running = false;
    document.getElementById('startPauseBtn').textContent = '再開';
  } else {
    state.running = true;
    document.getElementById('startPauseBtn').textContent = '一時停止';
    state.timer = setInterval(tick, 1000);
  }
}

function tick() {
  if (state.remainingSeconds <= 0) {
    finishTask();
    return;
  }
  state.remainingSeconds--;
  document.getElementById('timerDisplay').textContent = formatTime(state.remainingSeconds);
  const pct = (state.remainingSeconds / state.totalSeconds) * 100;
  document.getElementById('progressBar').style.width = pct + '%';
}

function finishTask() {
  clearInterval(state.timer);
  state.running = false;

  const task = state.tasks.find(t => t.id === state.activeTaskId);
  if (task) {
    task.completed = true;
    saveTasks();
    showNotification(`「${task.name}」が完了しました！`);
  }

  state.activeTaskId = null;
  document.getElementById('timerSection').classList.add('hidden');
  renderTasks();
}

function stopTimer() {
  clearInterval(state.timer);
  state.running = false;
  state.activeTaskId = null;
  document.getElementById('timerSection').classList.add('hidden');
  renderTasks();
}

function deleteTask(id) {
  if (state.activeTaskId === id) stopTimer();
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function showNotification(message) {
  const el = document.getElementById('notification');
  document.getElementById('notificationText').textContent = message;
  el.classList.remove('hidden');
  setTimeout(closeNotification, 4000);
}

function closeNotification() {
  document.getElementById('notification').classList.add('hidden');
}

function exportCSV() {
  if (state.tasks.length === 0) {
    showNotification('エクスポートするタスクがありません');
    return;
  }
  const header = 'タスク名,時間（分）,状態';
  const rows = state.tasks.map(t =>
    `"${t.name.replace(/"/g, '""')}",${t.minutes},${t.completed ? '完了' : '未完了'}`
  );
  const csv = '﻿' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timebox_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('addTaskBtn').addEventListener('click', addTask);
document.getElementById('taskName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});
document.getElementById('startPauseBtn').addEventListener('click', toggleStartPause);
document.getElementById('stopBtn').addEventListener('click', stopTimer);
document.getElementById('exportBtn').addEventListener('click', exportCSV);

renderTasks();
