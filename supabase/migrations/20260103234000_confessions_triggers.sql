-- Trigger to set goal to 'Achieved' when target is reached
CREATE OR REPLACE FUNCTION check_goal_achievement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.goal_total >= NEW.goal_target AND NEW.status = 'Active' THEN
        NEW.status := 'Achieved';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_goal_achievement ON confession_room_goals;
CREATE TRIGGER tr_check_goal_achievement
BEFORE UPDATE ON confession_room_goals
FOR EACH ROW
WHEN (OLD.goal_total IS DISTINCT FROM NEW.goal_total)
EXECUTE FUNCTION check_goal_achievement();

-- Ensure total is updated correctly when a contribution is made
CREATE OR REPLACE FUNCTION update_goal_total_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE confession_room_goals
    SET goal_total = goal_total + NEW.amount
    WHERE id = NEW.goal_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_goal_total_on_contribution ON confession_goal_contributions;
CREATE TRIGGER tr_update_goal_total_on_contribution
AFTER INSERT ON confession_goal_contributions
FOR EACH ROW
EXECUTE FUNCTION update_goal_total_on_contribution();
