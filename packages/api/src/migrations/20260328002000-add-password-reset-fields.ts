import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('users', 'reset_password_token', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'reset_password_expires', {
    type: DataTypes.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'reset_password_token');
  await queryInterface.removeColumn('users', 'reset_password_expires');
}
