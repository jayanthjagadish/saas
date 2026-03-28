import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('users', 'verified', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await queryInterface.addColumn('users', 'email_verified_token', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'email_verified_token_expires', {
    type: DataTypes.DATE,
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'email_verified_at', {
    type: DataTypes.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'email_verified_at');
  await queryInterface.removeColumn('users', 'email_verified_token_expires');
  await queryInterface.removeColumn('users', 'email_verified_token');
  await queryInterface.removeColumn('users', 'verified');
}
