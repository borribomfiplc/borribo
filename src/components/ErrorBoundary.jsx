import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA] p-6" style={{ fontFamily: "'Noto Sans Khmer','Inter',sans-serif" }}>
          <div className="bg-white rounded-2xl border border-[#EBEDF3] p-6 max-w-md w-full text-center">
            <div className="text-[#D9614F] font-bold mb-2">មានបញ្ហាកើតឡើង</div>
            <div className="text-sm text-[#5B5F73] break-words">{String(this.state.error.message || this.state.error)}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
