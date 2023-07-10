# Traffic Hand

Nhận diện động tác cánh tay để điều khiển đèn giao thông.

Dự án này là bài tập môn DSS301, của nhóm G2. Chương trình có sử dụng & tham khảo tài nguyên từ vài nguồn khác nhau.

## Công nghệ
### Web
- Node.
- Bootstrap.

### AI/ML
- MediaPipe.

## Yêu cầu
- Node 18+.

## Cách dùng

### Chạy web app
1. `npm install`.
2. `node app.js` hoặc `nodemon`.

### Hành động trước camera?

Có 3 động tác cánh tay tương ứng với từng tín hiệu đèn giao thông. Lưu ý là chúng ta chỉ dùng cánh tay **phải**.
- Đèn đỏ: Tay giơ cao lên trời. 
- Đèn xanh: Tay dang ngang bờ vai. 
- Đèn vàng: Bắp tay vuông góc với cẳng tay (không phải tay song song trước mặt).
