import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';

const types = ['Ăn uống', 'Đi lại', 'Học tập', 'Giải trí'];
const today = new Date().toISOString().slice(0, 10);
const sample = [
  { id: 1, content: 'Ăn sáng', money: 35000, type: 'Ăn uống', date: today },
  { id: 2, content: 'Gửi xe', money: 10000, type: 'Đi lại', date: today },
  { id: 3, content: 'Mua sách', money: 80000, type: 'Học tập', date: today }
];

function vnd(n) {
  return Number(n).toLocaleString('vi-VN') + ' đ';
}

class Clock extends Component {
  state = { time: new Date() };

  componentDidMount() {
    this.timer = setInterval(() => this.setState({ time: new Date() }), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    return <b>{this.state.time.toLocaleTimeString('vi-VN')}</b>;
  }
}

class ExpenseForm extends Component {
  state = { content: '', money: '', type: 'Ăn uống', date: today, error: '' };

  change = (e) => {
    this.setState({ [e.target.name]: e.target.value, error: '' });
  };

  submit = (e) => {
    e.preventDefault();
    const { content, money, type, date } = this.state;
    if (content.trim() === '' || money === '' || !Number.isFinite(Number(money)) || Number(money) <= 0 || !date) {
      this.setState({ error: 'Nhập đầy đủ nội dung, số tiền lớn hơn 0 và ngày chi' });
      return;
    }
    this.props.on_add({ content: content.trim(), money: Number(money), type, date });
    this.setState({ content: '', money: '', type: 'Ăn uống', date: today, error: '' });
  };

  render() {
    const { content, money, type, date, error } = this.state;
    return (
      <form onSubmit={this.submit} noValidate>
        <input name="content" placeholder="Nội dung" value={content} onChange={this.change} />
        <input name="money" type="number" min="1" placeholder="Số tiền" value={money} onChange={this.change} />
        <select name="type" value={type} onChange={this.change}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <input name="date" type="date" value={date} onChange={this.change} />
        <button>Thêm</button>
        {error && <p className="loi">{error}</p>}
      </form>
    );
  }
}

class ExpenseList extends Component {
  render() {
    if (this.props.items.length === 0) return <p>Không có khoản chi nào</p>;
    return (
      <table>
        <thead><tr><th>Nội dung</th><th>Số tiền</th><th>Loại</th><th>Ngày</th><th></th></tr></thead>
        <tbody>
          {this.props.items.map(x => (
            <tr key={x.id}>
              <td>{x.content}</td><td>{vnd(x.money)}</td><td>{x.type}</td><td>{x.date}</td>
              <td><button onClick={() => {
                if (window.confirm('Bạn muốn xóa khoản chi này?')) this.props.on_remove(x.id);
              }}>Xóa</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}

class App extends Component {
  state = { items: sample, filter: 'Tất cả', text: '', search: '', show_clock: true };
  search_timer = null;

  componentDidMount() {
    this.change_title();
  }

  componentDidUpdate(prev_props, prev_state) {
    if (prev_state.items !== this.state.items || prev_state.filter !== this.state.filter || prev_state.search !== this.state.search) {
      this.change_title();
    }
  }

  componentWillUnmount() {
    clearTimeout(this.search_timer);
  }

  shown = () => {
    return this.state.items.filter(x =>
      (this.state.filter === 'Tất cả' || x.type === this.state.filter) &&
      x.content.toLowerCase().includes(this.state.search.toLowerCase())
    );
  };

  change_title = () => {
    const total = this.shown().reduce((s, x) => s + Number(x.money), 0);
    document.title = 'Tổng chi: ' + vnd(total);
  };

  add = (item) => {
    this.setState(prev => ({ items: [...prev.items, { ...item, id: Date.now() }] }));
  };

  remove = (id) => {
    this.setState(prev => ({ items: prev.items.filter(x => x.id !== id) }));
  };

  search_change = (e) => {
    const value = e.target.value;
    this.setState({ text: value });
    clearTimeout(this.search_timer);
    this.search_timer = setTimeout(() => this.setState({ search: value }), 350);
  };

  render() {
    const list = this.shown();
    const total = list.reduce((s, x) => s + Number(x.money), 0);

    return (
      <div>
        <header>
          <h1>Sổ chi tiêu cá nhân (Class)</h1>
          <div>
            {this.state.show_clock && <Clock />}
            <button onClick={() => this.setState(prev => ({ show_clock: !prev.show_clock }))}>
              {this.state.show_clock ? 'Ẩn' : 'Hiện'} đồng hồ
            </button>
          </div>
        </header>
        <h2>Thêm khoản chi</h2>
        <ExpenseForm on_add={this.add} />
        <h2>Danh sách khoản chi</h2>
        <input placeholder="Tìm theo nội dung" value={this.state.text} onChange={this.search_change} />
        <div className="filters">
          {['Tất cả', ...types].map(t => (
            <button key={t} className={this.state.filter === t ? 'active' : ''}
              onClick={() => this.setState({ filter: t })}>{t}</button>
          ))}
        </div>
        <ExpenseList items={list} on_remove={this.remove} />
        <p className="sum">Tổng tiền: {vnd(total)}</p>
        <div className="stats">
          {types.map(t => <span key={t}>{t}: {vnd(this.state.items.filter(x => x.type === t)
            .reduce((s, x) => s + Number(x.money), 0))}</span>)}
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(<App />);
