const getMenu = (req, res) => {
  // Hardcoded menu configuration mirroring frontend AdminLayout
  const menu = [
    {
      key: 'human-resource',
      icon: '<TeamOutlined />',
      label: 'Human Resource',
      children: [
        { key: '/payroll', icon: '<DollarCircleOutlined />', label: '<Link to="/payroll">Payroll</Link>' },
        { key: '/attendance', icon: '<ClockCircleOutlined />', label: '<Link to="/attendance">Attendance</Link>' },
        { key: '/leave-management', icon: '<CalendarOutlined />', label: '<Link to="/leave-management">Leave Management</Link>' },
        { key: '/staff', icon: '<UserAddOutlined />', label: '<Link to="/staff">Staff</Link>' },
        { key: '/manage-staff', icon: '<TeamOutlined />', label: '<Link to="/manage-staff">Manage Staff</Link>' },
        { key: '/leads', icon: '<UserAddOutlined />', label: '<Link to="/leads">Leads & Bookings</Link>' },
        { key: '/brand-onboarding', icon: '<ShopOutlined />', label: '<Link to="/brand-onboarding">Brand Onboarding</Link>' },
      ],
    },
    {
      key: 'system',
      icon: '<SettingOutlined />',
      label: 'System',
      children: [
        { key: '/access', icon: '<KeyOutlined />', label: '<Link to="/access">Access</Link>' },
        { key: '/credentials', icon: '<KeyOutlined />', label: '<Link to="/credentials">Credentials Manager</Link>' },
        { key: '/settings', icon: '<SettingOutlined />', label: '<Link to="/settings">Settings</Link>' },
      ],
    },
  ];
  res.json({ success: true, data: menu });
};

module.exports = { getMenu };
