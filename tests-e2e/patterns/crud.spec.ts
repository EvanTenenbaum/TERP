import { test } from "@playwright/test";
import { CRUDPage } from "../page-objects/CRUDPage";
import crudEntities from "../fixtures/crud-entities.json" with { type: "json" };

// Parameterized test for all CRUD entities
for (const entity of crudEntities) {
  test.describe(`${entity.name} CRUD Flow`, () => {
    let crudPage: CRUDPage;

    test.beforeEach(async ({ page }) => {
      crudPage = new CRUDPage(page, entity);
      await crudPage.gotoList();
    });

    test(`should display ${entity.name} list page`, async () => {
      await crudPage.verifyListPage();
    });

    test(`should create new ${entity.name}`, async () => {
      await crudPage.create(entity.createData);
    });

    test(`should edit existing ${entity.name}`, async () => {
      await crudPage.edit(entity.editData);
    });

    test(`should delete ${entity.name}`, async () => {
      await crudPage.delete();
    });
  });
}
