import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const types = ['Ăn uống', 'Đi lại', 'Học tập', 'Giải trí'];
const today = new Date().toISOString().slice(0, 10);
const api = (import.meta.env.VITE_MOCKAPI_URL || '').replace(/\/$/, ''); // ko co link thi xai ls
const sample = [
  { id: '1', content: 'Ăn sáng', money: 35000, type: 'Ăn uống', date: today },
  { id: '2', content: 'Gửi xe', money: 10000, type: 'Đi lại', date: today },
  { id: '3', content: 'Mua sách', money: 80000, type: 'Học tập', date: today }
];

function vnd(n) {
  return Number(n).toLocaleString('vi-VN') + ' đ';
}

function useClock() {
  const [time, set_time] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => set_time(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time.toLocaleTimeString('vi-VN');
}

function Clock() {
  const time = useClock();
  return <b>{time}</b>;
}

function useFetch(url) {
  const [items, set_items] = useState([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState('');

  const load = useCallback(async () => {
    set_loading(true);
    set_error('');
    try {
      if (url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error();
        set_items(data);
      } else {
        const saved = localStorage.getItem('th3_expenses');
        set_items(saved ? JSON.parse(saved) : sample);
      }
    } catch {
      set_error('Không tải được dữ liệu');
    } finally {
      set_loading(false);
    }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  async function add(item) {
    set_error('');
    try {
      if (url) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        if (!res.ok) throw new Error();
        await load();
      } else {
        const list = [...items, { ...item, id: String(Date.now()) }];
        set_items(list);
        localStorage.setItem('th3_expenses', JSON.stringify(list));
      }
      return true;
    } catch {
      set_error('Không thêm được khoản chi');
      return false;
    }
  }

  async function remove(id) {
    set_error('');
    try {
      if (url) {
        const res = await fetch(url + '/' + id, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        await load();
      } else {
        const list = items.filter(x => String(x.id) !== String(id));
        set_items(list);
        localStorage.setItem('th3_expenses', JSON.stringify(list));
      }
    } catch {
      set_error('Không xóa được khoản chi');
    }
  }

  return { items, loading, error, add, remove };
}

const theme_ctx = createContext({ dark: false, toggle: () => {} });

function ThemeButton() {
  const theme = useContext(theme_ctx);
  return <button onClick={theme.toggle}>{theme.dark ? 'Chế độ sáng' : 'Chế độ tối'}</button>;
}

function ExpenseForm({ on_add }) {
  const [content, set_content] = useState('');
  const [money, set_money] = useState('');
  const [type, set_type] = useState('Ăn uống');
  const [date, set_date] = useState(today);
  const [error, set_error] = useState('');
  const input_ref = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (content.trim() === '' || money === '' || !Number.isFinite(Number(money)) || Number(money) <= 0 || !date) {
      set_error('Nhập đầy đủ nội dung, số tiền lớn hơn 0 và ngày chi');
      return;
    }
    const ok = await on_add({ content: content.trim(), money: Number(money), type, date });
    if (ok) {
      set_content('');
      set_money('');
      set_type('Ăn uống');
      set_date(today);
      set_error('');
      input_ref.current.focus();
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <input ref={input_ref} placeholder="Nội dung" value={content} onChange={e => set_content(e.target.value)} />
      <input type="number" min="1" placeholder="Số tiền" value={money} onChange={e => set_money(e.target.value)} />
      <select value={type} onChange={e => set_type(e.target.value)}>
        {types.map(t => <option key={t}>{t}</option>)}
      </select>
      <input type="date" value={date} onChange={e => set_date(e.target.value)} />
      <button>Thêm</button>
      {error && <p className="loi">{error}</p>}
    </form>
  );
}

function ExpenseList({ items, on_remove }) {
  if (items.length === 0) return <p>Không có khoản chi nào</p>;
  return (
    <table>
      <thead><tr><th>Nội dung</th><th>Số tiền</th><th>Loại</th><th>Ngày</th><th></th></tr></thead>
      <tbody>
        {items.map(x => (
          <tr key={x.id}>
            <td>{x.content}</td><td>{vnd(x.money)}</td><td>{x.type}</td><td>{x.date}</td>
            <td><button onClick={() => {
              if (window.confirm('Bạn muốn xóa khoản chi này?')) on_remove(x.id);
            }}>Xóa</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Book() {
  const { dark } = useContext(theme_ctx);
  const { items, loading, error, add, remove } = useFetch(api);
  const [filter, set_filter] = useState('Tất cả');
  const [text, set_text] = useState('');
  const [search, set_search] = useState('');
  const [show_clock, set_show_clock] = useState(true);

  useEffect(() => {
    // de go xong ti moi loc
    const timer = setTimeout(() => set_search(text), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const list = items.filter(x =>
    (filter === 'Tất cả' || x.type === filter) &&
    String(x.content).toLowerCase().includes(search.toLowerCase())
  );
  const total = list.reduce((s, x) => s + Number(x.money), 0);

  useEffect(() => {
    document.title = 'Tổng chi: ' + vnd(total);
  }, [total]);

  return (
    <div className={'page ' + (dark ? 'dark' : '')}>
      <header>
        <h1>Sổ chi tiêu cá nhân (Hooks)</h1>
        <div>
          {show_clock && <Clock />}
          <button onClick={() => set_show_clock(!show_clock)}>{show_clock ? 'Ẩn' : 'Hiện'} đồng hồ</button>
          <ThemeButton />
        </div>
      </header>
      <h2>Thêm khoản chi</h2>
      <ExpenseForm on_add={add} />
      <h2>Danh sách khoản chi</h2>
      <input placeholder="Tìm theo nội dung" value={text} onChange={e => set_text(e.target.value)} />
      <div className="filters">
        {['Tất cả', ...types].map(t => <button key={t} className={filter === t ? 'active' : ''}
          onClick={() => set_filter(t)}>{t}</button>)}
      </div>
      {loading && <p>Đang tải...</p>}
      {error && <p className="loi">{error}</p>}
      {!loading && <ExpenseList items={list} on_remove={remove} />}
      <p className="sum">Tổng tiền: {vnd(total)}</p>
      <div className="stats">
        {types.map(t => <span key={t}>{t}: {vnd(items.filter(x => x.type === t)
          .reduce((s, x) => s + Number(x.money), 0))}</span>)}
      </div>
    </div>
  );
}

function App() {
  const [dark, set_dark] = useState(false);
  return (
    <theme_ctx.Provider value={{ dark, toggle: () => set_dark(x => !x) }}>
      <Book />
    </theme_ctx.Provider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
