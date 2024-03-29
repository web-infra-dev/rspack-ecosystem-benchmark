import { Button, Typography, Badge } from '@arco-design/web-react';
import dayjs from 'dayjs';
import { ReactComponent as IconText } from './icons/text.svg';
import { ReactComponent as IconHorizontalVideo } from './icons/horizontal.svg';
import { ReactComponent as IconVerticalVideo } from './icons/vertical.svg';
import styles from './style/index.module.less';

const { Text } = Typography;

export const ContentType = ['图文', '横版短视频', '竖版短视频'];
export const FilterType = ['规则筛选', '人工'];
export const Status = ['未上线', '已上线'];

const ContentIcon = [
  <IconText key={0} />,
  <IconHorizontalVideo key={1} />,
  <IconVerticalVideo key={2} />,
];

export function getColumns(
  t: any,
  callback: (record: Record<string, any>, type: string) => Promise<void>,
) {
  return [
    {
      title: t['searchTable.columns.id'],
      dataIndex: 'id',
      render: value => <Text copyable={true}>{value}</Text>,
    },
    {
      title: t['searchTable.columns.name'],
      dataIndex: 'name',
    },
    {
      title: t['searchTable.columns.contentType'],
      dataIndex: 'contentType',
      render: value => (
        <div className={styles['content-type']}>
          {ContentIcon[value]}
          {ContentType[value]}
        </div>
      ),
    },
    {
      title: t['searchTable.columns.filterType'],
      dataIndex: 'filterType',
      render: value => FilterType[value],
    },
    {
      title: t['searchTable.columns.contentNum'],
      dataIndex: 'count',
      sorter: (a, b) => a.count - b.count,
      render(x) {
        return Number(x).toLocaleString();
      },
    },
    {
      title: t['searchTable.columns.createdTime'],
      dataIndex: 'createdTime',
      render: x => dayjs().subtract(x, 'days').format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => b.createdTime - a.createdTime,
    },
    {
      title: t['searchTable.columns.status'],
      dataIndex: 'status',
      render: x => {
        if (x === 0) {
          return <Badge status="error" text={Status[x]} />;
        }
        return <Badge status="success" text={Status[x]} />;
      },
    },
    {
      title: t['searchTable.columns.operations'],
      dataIndex: 'operations',
      headerCellStyle: { paddingLeft: '15px' },
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          onClick={() => callback(record, 'view')}>
          {t['searchTable.columns.operations.view']}
        </Button>
      ),
    },
  ];
}

export default () => ContentIcon;
