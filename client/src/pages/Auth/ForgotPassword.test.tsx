import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ForgotPassword from '@/pages/Auth/ForgotPassword';
import ResetPassword from '@/pages/Auth/ResetPassword';

vi.mock('@/api/auth.api', () => ({
  forgotPassword: vi.fn(),
  forgotPasswordReset: vi.fn(),
}));
vi.mock('@/assets/logo_app.svg', () => ({ default: 'logo.svg' }));

const api = vi.mocked(await import('@/api/auth.api'));

function renderForgot() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <ForgotPassword />
    </MemoryRouter>,
  );
}

function renderReset(token = 'abc123') {
  return render(
    <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPassword', () => {
  beforeEach(() => {
    api.forgotPassword.mockReset();
    api.forgotPassword.mockResolvedValue({ success: true, message: 'ok' });
  });

  it('submit thiếu email → hiện lỗi, không gọi API', async () => {
    renderForgot();
    fireEvent.click(screen.getByRole('button', { name: /Gửi Link Đặt Lại Mật Khẩu/i }));
    expect(await screen.findByText(/Vui lòng nhập email/i)).toBeInTheDocument();
    expect(api.forgotPassword).not.toHaveBeenCalled();
  });

  it('submit có email → gọi API và hiện thông báo chung (không rò email tồn tại)', async () => {
    renderForgot();
    fireEvent.change(screen.getByPlaceholderText('Input email'), {
      target: { value: 'admin@nhamnhi.vn' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Gửi Link Đặt Lại Mật Khẩu/i }));
    expect(await screen.findByText(/Nếu email tồn tại/i)).toBeInTheDocument();
    expect(api.forgotPassword).toHaveBeenCalledWith('admin@nhamnhi.vn');
  });

  it('API lỗi → hiện thông báo lỗi', async () => {
    api.forgotPassword.mockResolvedValue({ success: false, message: 'Có lỗi xảy ra' });
    renderForgot();
    fireEvent.change(screen.getByPlaceholderText('Input email'), {
      target: { value: 'a@b.vn' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Gửi Link Đặt Lại Mật Khẩu/i }));
    expect(await screen.findByText(/Có lỗi xảy ra/i)).toBeInTheDocument();
  });
});

describe('ResetPassword', () => {
  beforeEach(() => {
    api.forgotPasswordReset.mockReset();
    api.forgotPasswordReset.mockResolvedValue({ success: true, message: 'ok' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function fillAndSubmit(password: string, confirm: string) {
    const inputs = screen.getAllByPlaceholderText(/password/i);
    fireEvent.change(inputs[0]!, { target: { value: password } });
    fireEvent.change(inputs[1]!, { target: { value: confirm } });
    fireEvent.click(screen.getByRole('button', { name: /Đặt Lại Mật Khẩu/i }));
  }

  it('mật khẩu không khớp → lỗi, không gọi API', async () => {
    renderReset('tok123');
    fillAndSubmit('Abc12345', 'Abc12346');
    expect(await screen.findByText(/không khớp/i)).toBeInTheDocument();
    expect(api.forgotPasswordReset).not.toHaveBeenCalled();
  });

  it('mật khẩu quá ngắn → lỗi, không gọi API', async () => {
    renderReset('tok123');
    fillAndSubmit('123', '123');
    expect(await screen.findByText(/ít nhất 6 ký tự/i)).toBeInTheDocument();
    expect(api.forgotPasswordReset).not.toHaveBeenCalled();
  });

  it('hợp lệ → gọi API với token từ URL + hiển thị thông báo thành công', async () => {
    renderReset('abc123');
    fillAndSubmit('NewPass123', 'NewPass123');
    expect(api.forgotPasswordReset).toHaveBeenCalledWith('abc123', 'NewPass123');
    expect(await screen.findByText(/Đặt lại mật khẩu thành công/i)).toBeInTheDocument();
  });

  it('token sai/hết hạn → hiện lỗi + link yêu cầu lại link mới', async () => {
    api.forgotPasswordReset.mockResolvedValue({
      success: false,
      message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
    });
    renderReset('tok-het-han');
    fillAndSubmit('NewPass123', 'NewPass123');
    expect(await screen.findByText(/đã hết hạn/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Yêu cầu lại link mới/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
});