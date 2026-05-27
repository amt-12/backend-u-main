// src/controller/Menu/menuController.js
// This controller returns the sidebar menu configuration used across the admin panel.
// It mirrors the structure defined in the frontend AdminLayout component.

// NOTE: In a real application this would likely be driven by a database or a config file.
// For now we return a static JSON payload matching the user's request.

const getMenu = async (req, res) => {
  try {
    const menu = [
      {
        key: 'human-resource',
        icon: 'TeamOutlined',
        label: 'Human Resource',
        children: [
          {
            key: '/payroll',
            icon: 'DollarCircleOutlined',
            label: '/payroll',
          },
          {
            key: '/attendance',
            icon: 'ClockCircleOutlined',
            label: '/attendance',
          },
          {
            key: '/leave-management',
            icon: 'CalendarOutlined',
            label: '/leave-management',
          },
          {
            key: '/staff',
            icon: 'UserAddOutlined',
            label: '/staff',
          },
          {
            key: '/manage-staff',
            icon: 'TeamOutlined',
            label: '/manage-staff',
          },
          {
            key: '/leads',
            icon: 'UserAddOutlined',
            label: '/leads',
          },
          {
            key: '/brand-onboarding',
            icon: 'ShopOutlined',
            label: '/brand-onboarding',
          },
        ],
      },
      {
        key: 'system',
        icon: 'SettingOutlined',
        label: 'System',
        children: [
          {
            key: '/access',
            icon: 'KeyOutlined',
            label: '/access',
          },
          {
            key: '/credentials',
            icon: 'KeyOutlined',
            label: '/credentials',
          },
          {
            key: '/settings',
            icon: 'SettingOutlined',
            label: '/settings',
          },
        ],
      },
    ];
    res.json({ success: true, menu });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving menu' });
  }
};
module.exports = { getMenu };
