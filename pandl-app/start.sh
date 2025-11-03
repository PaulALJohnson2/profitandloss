#!/bin/bash

echo "=========================================="
echo "  P&L Dashboard Application"
echo "=========================================="
echo ""
echo "Starting backend server..."
echo ""

cd "$(dirname "$0")"

# Start backend
cd backend
node server.js &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2

# Start frontend
cd ../frontend
echo ""
echo "Starting frontend development server..."
echo ""
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "  Application Started!"
echo "=========================================="
echo ""
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:3000"
echo ""
echo "  Open http://localhost:3000 in your browser"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "=========================================="
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Keep script running
wait
