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
            key: '/staff-management',
            icon: 'TeamOutlined',
            label: '/staff-management',
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
            key: '/performance-credits',
            icon: 'RiseOutlined',
            label: '/performance-credits',
          },
          {
            key: '/payroll-finance',
            icon: 'DollarCircleOutlined',
            label: '/payroll-finance',
          },
        ],
      },
      {
        key: 'clients-crm',
        icon: 'AppstoreOutlined',
        label: 'Clients & CRM',
        children: [
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
          {
            key: '/onboarded-clients',
            icon: 'CheckCircleOutlined',
            label: '/onboarded-clients',
          },
          {
            key: '/client-followups',
            icon: 'ClockCircleOutlined',
            label: '/client-followups',
          },
        ],
      },
      {
        key: 'client-operations',
        icon: 'ApartmentOutlined',
        label: 'Client Operations',
        children: [
          {
            key: '/deliverables',
            icon: 'BookOutlined',
            label: '/deliverables',
          },
          {
            key: '/task-management',
            icon: 'CheckSquareOutlined',
            label: '/task-management',
          },
          {
            key: '/posting',
            icon: 'RocketOutlined',
            label: '/posting',
          },
          {
            key: '/seo-manager',
            icon: 'CalendarOutlined',
            label: '/seo-manager',
          },
        ],
      },

      {
        key: 'reports-analytics',
        icon: 'NotificationOutlined',
        label: 'Reports & Analytics',
        children: [
          {
            key: '/employee-performance',
            icon: 'FileTextOutlined',
            label: '/employee-performance',
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
            icon: 'SafetyOutlined',
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
