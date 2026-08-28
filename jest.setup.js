import '@testing-library/jest-dom';
import React from 'react';

jest.mock('antd/es/notification', () => ({
  __esModule: true,
  default: {
    useNotification: () => [
      {
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
      },
      null,
    ],
  },
  useNotification: () => [
    {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
    },
    null,
  ],
}));

jest.mock('antd/es/table', () => ({
  __esModule: true,
  default: function MockAntdTable(props) {
    const columns = props.columns || [];
    const dataSource = props.dataSource || [];
    const onRow = props.onRow;
    const rowKey = props.rowKey;

    return React.createElement(
      'table',
      null,
      React.createElement(
        'thead',
        null,
        React.createElement(
          'tr',
          null,
          columns.map((col, idx) =>
            React.createElement(
              'th',
              { key: col.key || col.dataIndex || idx },
              typeof col.title === 'function' ? col.title() : col.title
            )
          )
        )
      ),
      React.createElement(
        'tbody',
        null,
        dataSource.length === 0
          ? React.createElement(
              'tr',
              null,
              React.createElement(
                'td',
                { colSpan: columns.length || 1 },
                'Chưa có sách'
              )
            )
          : dataSource.map((item, rowIdx) => {
              const rowProps = onRow ? onRow(item) : {};
              const key = typeof rowKey === 'function' ? rowKey(item) : (item && item[rowKey]) || rowIdx;
              return React.createElement(
                'tr',
                { key, ...rowProps },
                columns.map((col, colIdx) => {
                  const val = col.dataIndex ? item[col.dataIndex] : undefined;
                  return React.createElement(
                    'td',
                    { key: col.key || col.dataIndex || colIdx },
                    col.render ? col.render(val, item, rowIdx) : val
                  );
                })
              );
            })
      )
    );
  },
}));
