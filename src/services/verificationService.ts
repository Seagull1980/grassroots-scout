import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const verificationService = {
  // Get verification status for a user
  async getStatus(userId: number) {
    const response = await axios.get(`${API_BASE_URL}/verification/status/${userId}`);
    return response.data;
  },

  // Verify a user (Admin only)
  async verifyUser(userId: number, notes?: string) {
    const response = await axios.post(`${API_BASE_URL}/verification/verify/${userId}`, { notes });
    return response.data;
  },

  // Unverify a user (Admin only)
  async unverifyUser(userId: number) {
    const response = await axios.post(`${API_BASE_URL}/verification/unverify/${userId}`);
    return response.data;
  },

  // Get all verified users
  async getVerifiedUsers() {
    const response = await axios.get(`${API_BASE_URL}/verification/verified-users`);
    return response.data;
  }
};

export default verificationService;
