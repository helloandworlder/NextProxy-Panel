import { useEffect } from 'react';
import { Modal, Form, Input, Switch, message } from 'antd';
import { useCreateSystemAdmin, useUpdateSystemAdmin } from '../hooks/useSystemAdmin';
import { useI18n } from '@/hooks/useI18n';
import type { SystemAdmin, CreateSystemAdminRequest, UpdateSystemAdminRequest } from '../api/systemAdminApi';

interface Props {
  open: boolean;
  admin: SystemAdmin | null;
  onClose: () => void;
}

export function SystemAdminFormModal({ open, admin, onClose }: Props) {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const { mutate: createAdmin, isPending: creating } = useCreateSystemAdmin();
  const { mutate: updateAdmin, isPending: updating } = useUpdateSystemAdmin();

  useEffect(() => {
    if (open) {
      if (admin) {
        form.setFieldsValue({
          username: admin.username,
          email: admin.email,
          enable: admin.enable,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ enable: true });
      }
    }
  }, [open, admin, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    
    if (admin) {
      const data: UpdateSystemAdminRequest = {
        email: values.email,
        enable: values.enable,
      };
      if (values.password) {
        data.password = values.password;
      }
      updateAdmin(
        { id: admin.id, data },
        {
          onSuccess: () => {
            message.success(t('common.updateSuccess'));
            onClose();
          },
          onError: (err: Error) => message.error(err.message),
        }
      );
    } else {
      const data: CreateSystemAdminRequest = {
        username: values.username,
        password: values.password,
        email: values.email,
      };
      createAdmin(data, {
        onSuccess: () => {
          message.success(t('common.createSuccess'));
          onClose();
        },
        onError: (err: Error) => message.error(err.message),
      });
    }
  };

  return (
    <Modal
      title={admin ? t('systemAdmin.editAdmin') : t('systemAdmin.addAdmin')}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={creating || updating}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="username"
          label={t('systemAdmin.username')}
          rules={[{ required: !admin, min: 3 }]}
        >
          <Input disabled={!!admin} placeholder={t('systemAdmin.usernamePlaceholder')} />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('systemAdmin.password')}
          rules={[{ required: !admin, min: 8 }]}
        >
          <Input.Password placeholder={admin ? t('systemAdmin.passwordUpdateHint') : t('systemAdmin.passwordPlaceholder')} />
        </Form.Item>
        <Form.Item name="email" label={t('systemAdmin.email')}>
          <Input type="email" placeholder={t('systemAdmin.emailPlaceholder')} />
        </Form.Item>
        {admin && (
          <Form.Item name="enable" label={t('common.enable')} valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
